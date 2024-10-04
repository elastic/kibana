---
title: "Protecting your devices from information theft"
slug: "protecting-your-devices-from-information-theft-keylogger-protection"
date: "2024-05-30"
subtitle: "Keylogger detection using Windows API behaviors"
description: "In this article, we will introduce the keylogger and keylogging detection features added this year to Elastic Defend (starting from version 8.12), which is responsible for endpoint protection in Elastic Security."
author:
- slug: asuka-nakajima
image: "Security Labs Images 10.jpg"
category:
  - slug: security-operations
  - slug: security-research
  - slug: detection-science
tags:
  - detection engineering
  - threat hunting
  - threat detection
---

In this article, we will introduce the keylogger and keylogging detection features added this year to Elastic Defend (starting from [version 8.12](https://www.elastic.co/guide/en/security/8.12/release-notes-header-8.12.0.html#enhancements-8.12.0)), which is responsible for endpoint protection in Elastic Security. This article is also available in [Japanese](https://www.elastic.co/security-labs/protecting-your-devices-from-information-theft-keylogger-protection-jp).

## Introduction

Starting with Elastic Defend 8.12, we have enhanced the detection of keyloggers and malware with keylogging capabilities (such as information-stealing malware or remote access trojans, better known as RATs) on Windows by monitoring and recording the calls to representative Windows APIs used by keyloggers. This publication will focus on providing a detailed technical background of this new feature. Additionally, we will introduce the new prebuilt behavioral detection rules created in conjunction with this feature.

### What is a keylogger and what are their risks?

A keylogger is a type of software that monitors and records the keystrokes entered on a computer (※1). While keyloggers can be used for legitimate purposes such as user monitoring, they are frequently abused by malicious actors. Specifically, they are used to steal sensitive information such as authentication credentials, credit card details, and various confidential data entered through the keyboard. (※1: While there are hardware keyloggers that can be attached directly to a PC via USB, this article focuses on software keyloggers.)

The sensitive information obtained through keyloggers can be exploited for monetary theft or as a stepping stone for further cyber attacks. Therefore, although keylogging itself does not directly damage the computer, early detection is crucial to preventing subsequent, more invasive cyber attacks.

There are many types of malware with keylogging capabilities, particularly RATs, information stealers, and banking malware. Some well-known malware with keylogging functionality includes [Agent Tesla](https://malpedia.caad.fkie.fraunhofer.de/details/win.agent_tesla), [LokiBot](https://malpedia.caad.fkie.fraunhofer.de/details/apk.lokibot), and [SnakeKeylogger](https://malpedia.caad.fkie.fraunhofer.de/details/win.404keylogger).

### How are keystrokes stolen?

Next, let's explain from a technical perspective how keyloggers function without being detected. While keyloggers can be used within various operating system environments (Windows/Linux/macOS and mobile devices), this article will focus on Windows keyloggers. Specifically, we will describe four distinct types of keyloggers that capture keystrokes using Windows APIs and functions (※2).

As a side note, the reason for explaining keylogging methods here is to deepen the understanding of the new detection features introduced in the latter half of this article. Therefore, the example code provided is for illustrative purposes only and is not intended to be executable as is (※3).

(※2: Keyloggers running on Windows can be broadly divided into those installed in kernel space (OS side) and those installed in the same space as regular applications (user space). This article focuses on the latter type.)
(※3: If a keylogger is created and misused based on the example code provided below, Elastic will not be responsible for any consequences.)

 1. Polling-based keylogger

This type of keylogger polls or periodically checks the state of each key on the keyboard (whether the key is pressed) at short intervals (much shorter than one second). If a keylogger detects that a new key has been pressed since the last check, it records and saves the information of the pressed key. By repeating this process, the keylogger captures the characters entered by the user.

Polling-based keyloggers are implemented using Windows APIs that check the state of key inputs, with the [```GetAsyncKeyState```](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate) API being a representative example. This API can determine whether a specific key is currently pressed and whether that key has been pressed since the last API call. Below is a simple example of a polling-based keylogger using the ```GetAsyncKeyState``` API:

``` c
while(true)
{
    for (int key = 1; key <= 255; key++)
    {
        if (GetAsyncKeyState(key) & 0x01)
        {
            SaveTheKey(key, "log.txt");
        }
    }
    Sleep(50);
}
```

The method of polling (```GetAsyncKeyState```) to capture key press states is not only a well-known, classic keylogging technique, but it is also commonly used by malware today.

 2. Hooking-based keylogger
 
Hooking-based keyloggers, like polling-based keyloggers, are a classic type that has been around for a long time. Let's first explain what a "hook" is.

A hook is a mechanism that allows you to insert custom processing (custom code) into specific operations of an application. Using a hook to insert custom processing is known as "hooking."

Windows provides a mechanism that allows you to hook messages (events) such as key inputs to an application, and this can be utilized through the [```SetWindowsHookEx```](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowshookexw) API. Below is a simple example of a hooking-based keylogger using the ```SetWindowsHookEx``` API:

``` c
HMODULE hHookLibrary = LoadLibraryW(L"hook.dll");
FARPROC hookFunc = GetProcAddress(hHookLibrary, "SaveTheKey");

HHOOK keyboardHook = NULL;
    
keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL,
                (HOOKPROC)hookFunc,
                hHookLibrary,
                0);
```

 3. Keylogger using the Raw Input Model
 
This type of keylogger captures and records raw input data obtained directly from input devices like keyboards. Before delving into the details of this type of keylogger, it's essential to understand the "Original Input Model" and "Raw Input Model" in Windows. Here's an explanation of each input method:

 - **Original Input Model**: The data entered from input devices like keyboards is processed by the OS before being delivered to the application.
 - **Raw Input Model**: The data entered from input devices is received directly by the application without any intermediate processing by the OS.
 
Initially, Windows only used the Original Input Model. However, with the introduction of Windows XP, the Raw Input Model was added, likely due to the increasing diversity of input devices. In the Raw Input Model, the [```RegisterRawInputDevices```](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerrawinputdevices) API is used to register the input devices from which you want to receive raw data directly. Subsequently, the [```GetRawInputData```](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getrawinputdata) API is used to obtain the raw data.

Below is a simple example of a keylogger using the Raw Input Model and these APIs:

``` c
LRESULT CALLBACK WndProc(HWND hWnd, UINT uMessage, WPARAM wParam, LPARAM lParam)
{

    UINT dwSize = 0;
    RAWINPUT* buffer = NULL;

    switch (uMessage)
    {
    case WM_CREATE:
        RAWINPUTDEVICE rid;
        rid.usUsagePage = 0x01;  // HID_USAGE_PAGE_GENERIC
        rid.usUsage = 0x06;      // HID_USAGE_GENERIC_KEYBOARD
        rid.dwFlags = RIDEV_NOLEGACY | RIDEV_INPUTSINK;
        rid.hwndTarget = hWnd;
        RegisterRawInputDevices(&rid, 1, sizeof(rid));
        break;
    case WM_INPUT:
        GetRawInputData((HRAWINPUT)lParam, RID_INPUT, NULL, &dwSize, sizeof(RAWINPUTHEADER));

        buffer = (RAWINPUT*)HeapAlloc(GetProcessHeap(), 0, dwSize);

        if (GetRawInputData((HRAWINPUT)lParam, RID_INPUT, buffer, &dwSize, sizeof(RAWINPUTHEADER)))
        {
            if (buffer->header.dwType == RIM_TYPEKEYBOARD)
            {
                SaveTheKey(buffer, "log.txt");
            }
        }
        HeapFree(GetProcessHeap(), 0, buffer);
        break;
    default:
        return DefWindowProc(hWnd, uMessage, wParam, lParam);
    }
    return 0;
}
```

In this example, ```RegisterRawInputDevices``` is used to register the input devices from which raw input data is to be received. Here, it is set to receive raw input data from the keyboard.

 4. Keylogger using ```DirectInput```
 
Finally, let's discuss a keylogger that uses ```DirectInput```. In simple terms, this keylogger abuses the functionalities of Microsoft DirectX. DirectX is a collection of APIs (libraries) used for handling multimedia tasks such as games and videos.

Since obtaining various inputs from users is essential in gaming, DirectX also provides APIs for processing user inputs. The APIs provided before DirectX version 8 are known as ```DirectInput```. Below is a simple example of a keylogger using related APIs. As a side note, when acquiring key states using ```DirectInput```, the ```RegisterRawInputDevices``` API is called in the background.

``` c
LPDIRECTINPUT8		lpDI = NULL;
LPDIRECTINPUTDEVICE8	lpKeyboard = NULL;

BYTE key[256];
ZeroMemory(key, sizeof(key));

DirectInput8Create(hInstance, DIRECTINPUT_VERSION, IID_IDirectInput8, (LPVOID*)&lpDI, NULL);
lpDI->CreateDevice(GUID_SysKeyboard, &lpKeyboard, NULL);
lpKeyboard->SetDataFormat(&c_dfDIKeyboard);
lpKeyboard->SetCooperativeLevel(hwndMain, DISCL_FOREGROUND | DISCL_NONEXCLUSIVE | DISCL_NOWINKEY);

while(true)
{
    HRESULT ret = lpKeyboard->GetDeviceState(sizeof(key), key);
    if (FAILED(ret)) {
        lpKeyboard->Acquire();
        lpKeyboard->GetDeviceState(sizeof(key), key);
    }
  SaveTheKey(key, "log.txt");	
    Sleep(50);
}
```

## Detecting keyloggers by monitoring Windows API calls

Elastic Defend uses Event Tracing for Windows (ETW ※4) to detect the aforementioned keylogger types. This is achieved by monitoring calls to related Windows APIs and logging particularly anomalous behavior. Below are the Windows APIs being monitored and the newly created keylogger detection rules associated with these APIs. (※4: In short, ETW is a mechanism provided by Microsoft for tracing and logging the execution of applications and system components in Windows, such as device drivers.)

### Monitored Windows APIs:

 - [GetAsyncKeyState](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate)
 - [SetWindowsHookEx](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowshookexw)
 - [RegisterRawInputDevice](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerrawinputdevices)

### New keylogger endpoint detection rules:

 - [GetAsyncKeyState API Call from Suspicious Process](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_getasynckeystate_api_call_from_suspicious_process.toml)
 - [GetAsyncKeyState API Call from Unusual Process](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_getasynckeystate_api_call_from_unusual_process.toml)
 - [Keystroke Input Capture via DirectInput](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystroke_input_capture_via_directinput.toml)
 - [Keystroke Input Capture via RegisterRawInputDevices](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystroke_input_capture_via_registerrawinputdevices.toml)
 - [Keystroke Messages Hooking via SetWindowsHookEx](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystroke_messages_hooking_via_setwindowshookex.toml)
 - [Keystrokes Input Capture from a Managed Application](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystrokes_input_capture_from_a_managed_application.toml)
 - [Keystrokes Input Capture from a Suspicious Module](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystrokes_input_capture_from_a_suspicious_module.toml)
 - [Keystrokes Input Capture from Suspicious CallStack](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystrokes_input_capture_from_suspicious_callstack.toml)
 - [Keystrokes Input Capture from Unsigned DLL](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystrokes_input_capture_from_unsigned_dll.toml)
 - [Keystrokes Input Capture via SetWindowsHookEx](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystrokes_input_capture_via_setwindowshookex.toml)

With this new set of capabilities, Elastic Defend can provide comprehensive monitoring and detection of keylogging activity, enhancing the security and protection of Windows endpoints against these threats.

### Detecting Windows keyloggers

Next, let’s walk through an example of how the detection works in practice. We'll detect a keylogger using the Raw Input Model with Elastic Defend. For this example, we prepared a simple PoC keylogger named ```Keylogger.exe``` that uses the ```RegisterRawInputDevices``` API and executed it in our test environment ※5. (※5:The execution environment is Windows 10 Version 22H2 19045.4412, the latest version available at the time of writing.)

![Elastic Security alert](/assets/images/protecting-your-devices-from-information-theft-keylogger-protection/image1.png)
　
Shortly after the keylogger was executed, a detection rule  ([Keystroke Input Capture via RegisterRawInputDevices](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystroke_input_capture_via_registerrawinputdevices.toml)) was triggered on the endpoint, showing an alert.  The further details of this alert can be viewed within Kibana.

![Elastic Security alert dashboard](/assets/images/protecting-your-devices-from-information-theft-keylogger-protection/image3.png)

Here are the details of the detection rule, note the specific API referenced in the example. 

``` sql
query = '''
api where
 process.Ext.api.name == "RegisterRawInputDevices" and not process.code_signature.status : "trusted" and
 process.Ext.api.parameters.usage : ("HID_USAGE_GENERIC_KEYBOARD", "KEYBOARD") and
 process.Ext.api.parameters.flags : "*INPUTSINK*" and process.thread.Ext.call_stack_summary : "?*" and
 process.thread.Ext.call_stack_final_user_module.hash.sha256 != null and process.executable != null and
 not process.thread.Ext.call_stack_final_user_module.path :
                         ("*\\program files*", "*\\windows\\system32\\*", "*\\windows\\syswow64\\*",
                          "*\\windows\\systemapps\\*",
                          "*\\users\\*\\appdata\\local\\*\\kumospace.exe",
                          "*\\users\\*\\appdata\\local\\microsoft\\teams\\current\\teams.exe") and 
 not process.executable : ("?:\\Program Files\\*.exe", "?:\\Program Files (x86)\\*.exe")
'''
```

This rule raises an alert when an unsigned process, or a process signed by an untrusted signer, calls the ```RegisterRawInputDevices``` API to capture keystrokes. More specifically, Elastic Defend monitors the arguments passed to the ```RegisterRawInputDevices``` API, particularly the members of the [```RAWINPUTDEVICE``` structure](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-rawinputdevice), which is the first argument of this API.

This raises an alert when these argument values indicate an attempt to capture keyboard input. The logs of the ```RegisterRawInputDevices``` API can also be viewed within Kibana.

![```RegisterRawInputDevices``` API logs displayed in Kibana](/assets/images/protecting-your-devices-from-information-theft-keylogger-protection/image2.png)

### Data Collected During Windows API Calls

Due to space constraints, this article does not cover all of the detection rules and API details that were added. However, we will briefly describe the data that Elastic Defend collects during calls to the relevant Windows APIs. For further explanations for each item, please refer to the Elastic Common Schema (ECS) mapping detailed in [```custom_api.yml```](https://github.com/elastic/endpoint-package/blob/main/custom_schemas/custom_api.yml).

| API Name | Field | Description | Example |
| --- | --- | --- | --- |
| GetAsyncKeyState | process.Ext.api.metadata.ms_since_last_keyevent | This parameter indicates an elapsed time in milliseconds between the last GetAsyncKeyState event. | 94 |
| GetAsyncKeyState | process.Ext.api.metadata.background_callcount | This parameter indicates a number of all GetAsyncKeyState api calls, including unsuccessful calls, between the last successful GetAsyncKeyState call. | 6021 |
| SetWindowsHookEx | process.Ext.api.parameters.hook_type | Type of hook procedure to be installed. | "WH_KEYBOARD_LL"
| SetWindowsHookEx | process.Ext.api.parameters.hook_module | DLL containing the hook procedure. | "c:\\windows\\system32\\taskbar.dll"
| SetWindowsHookEx | process.Ext.api.parameters.procedure | The memory address of the procedure or function. | 2431737462784 |
| SetWindowsHookEx | process.Ext.api.metadata.procedure_symbol | Summary of the hook procedure. | "taskbar.dll" |
| RegisterRawInputDevices | process.Ext.api.metadata.return_value | Return value of RegisterRawInputDevices API call. | 1 |
| RegisterRawInputDevices | process.Ext.api.parameters.usage_page | This parameter indicates the top-level collection (Usage Page) of the device. First member RAWINPUTDEVICE structure. | "GENERIC" |
| RegisterRawInputDevices | process.Ext.api.parameters.usage | This parameter indicates the specific device (Usage) within the Usage Page. Second member RAWINPUTDEVICE structure. | "KEYBOARD" |
| RegisterRawInputDevices | process.Ext.api.parameters.flags | Mode flag that specifies how to interpret the information provided by UsagePage and Usage. Third member RAWINPUTDEVICE structure. | "INPUTSINK" |
| RegisterRawInputDevices | process.Ext.api.metadata.windows_count | Number of windows owned by the caller thread. | 2 |
| RegisterRawInputDevices | process.Ext.api.metadata.visible_windows_count | Number of visible windows owned by the caller thread. | 0 |
| RegisterRawInputDevices | process.Ext.api.metadata.thread_info_flags | Thread info flags. | 16 |
| RegisterRawInputDevices | process.Ext.api.metadata.start_address_module | Name of the module associated with the starting address of a thread. | "C:\\Windows\\System32\\DellTPad\\ApMsgFwd.exe" |
| RegisterRawInputDevices | process.Ext.api.metadata.start_address_allocation_protection | Memory protection attributes associated with the starting address of a thread. | "RCX" |

## Conclusion

In this article, we introduced the keylogger and keylogging detection features for Windows environments that were added starting from Elastic Defend 8.12. Specifically, by monitoring calls to representative Windows APIs related to keylogging, we have integrated a behavioral keylogging detection approach that does not rely on signatures. To ensure accuracy and reduce the false positive rate, we have created this feature and new rules based on months of research.

In addition to keylogging-related APIs, Elastic Defend also monitors [other APIs commonly used by malicious actors, such as those for memory manipulation](https://www.elastic.co/security-labs/doubling-down-etw-callstacks), providing multi-layered protection. If you are interested in Elastic Security and Elastic Defend, please check out the [product page](https://www.elastic.co/security) and [documentation](https://www.elastic.co/videos/intro-elastic-security).
