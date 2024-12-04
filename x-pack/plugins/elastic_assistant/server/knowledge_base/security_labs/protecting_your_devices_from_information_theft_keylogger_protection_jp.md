---
title: "情報窃取から端末を守る"
slug: "protecting-your-devices-from-information-theft-keylogger-protection-jp"
date: "2020-05-30"
subtitle: "Windows APIの挙動を用いたキーロガー検知"
description: "本記事ではElastic Securityにおいて、エンドポイント保護を担っているElastic Defendに今年(バージョン8.12より)新たに追加された、キーロガーおよびキーロギング検出機能について紹介します。"
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

本記事ではElastic Securityにおいて、エンドポイント保護を担っているElastic Defendに今年(バージョン[8.12](https://www.elastic.co/guide/en/security/8.12/release-notes-header-8.12.0.html#enhancements-8.12.0)より)新たに追加された、キーロガーおよびキーロギング検出機能について紹介します。

## はじめに

Elastic Defend 8.12より、Windows上で動作するキーロガーおよび、キーロギング機能を備えたマルウェア(情報窃取型マルウェアや、リモートアクセス型トロイの木馬、通称RAT)の検知の強化を目的に、キーロガーが使用する代表的なWindows API群の呼び出しを監視・記録する機能が追加されました。本記事ではこの新機能に焦点を当て、その技術的な詳細を解説します。加えて、本機能に付随して新たに作成された振る舞い検知ルール(Prebuilt rule)についても紹介します。

### キーロガーとはなにか？どのような危険性があるのか？

キーロガーとは、コンピュータ上で入力されたキーの内容を監視および記録(キーロギング)するソフトウェアの一種です(※1)。キーロガーは、ユーザのモニタリングなどの正当な理由で利用されることもありますが、攻撃者によって頻繁に悪用されるソフトウェアです。具体的には、ユーザがキーボード経由で入力した認証情報やクレジットカード情報、各種機密情報などのセンシティブな情報の窃取などに際に使われます。(※1: パソコンにUSB等で直接取り付けるようなハードウェア型のキーロガーもありますが、本記事ではソフトウェア型のキーロガーに焦点を当てます。)

キーロガーを通じて入手したセンシティブな情報は、金銭の窃取やさらなるサイバー攻撃の足がかりに悪用されます。それゆえに、キーロギング行為自体は直接的にコンピュータに被害をおよばさないものの、続くサイバー攻撃の被害を食い止めるためにも、早期の検知が非常に重要だと言えます。

キーロギング機能を持つマルウェアは多々あり、特にRAT、情報窃取型マルウェア、バンキングマルウェアといった種類のマルウェアにキーロギング機能が搭載されている場合があることが確認されています。有名なマルウェアでキーロギング機能を有するものとしては[Agent Tesla](https://malpedia.caad.fkie.fraunhofer.de/details/win.agent_tesla)や[Lokibit](https://malpedia.caad.fkie.fraunhofer.de/details/apk.lokibot)、そして[SnakeKeylogger](https://malpedia.caad.fkie.fraunhofer.de/details/win.404keylogger)などが挙げられます。

### いかにして入力した文字を盗み取っているのか？

では次に、キーロガーはいかにしてユーザがキーボードから入力した文字を、ユーザに気づかれること無く盗み取っているのかを、技術的な観点から説明していきます。キーロガー自体は、あらゆるOS環境(Windows/Linux/macOSやモバイルデバイス)で存在しうるものではありますが、本記事ではWindowsのキーロガーに焦点を絞って解説します。特にWindows APIや機能を使用してキー入力を取得する4つの異なるタイプのキーロガーについて解説します。

一点補足としては、ここでキーロギングの手法について説明しているのは、あくまで本記事後半で紹介している、新しい検知機能についての理解を深めていただくためです。そのため、例として掲載しているコードはあくまで単なる例であり、実際にそのまま動くコードが掲載されている訳ではありません(※3)。

(※2:  Windows上で動作するキーロガーは、カーネル空間(OS)側に設置されるものと、通常のアプリケーションと同じ領域(ユーザ空間)に設置されるものに大別されます。本記事では、後者のタイプを取り上げます。 )
(※3: 以下に掲載されている例のコードを元にキーロガーを作成し悪用した場合、弊社では対応、および、責任について負いかねます 。)

 1. ポーリング型キーロガー
 
このタイプのキーロガーは、キーボードの各キーの状態(キーが押された否か)を短い間隔(1秒よりはるかに短い間隔)で定期的に確認します。そして前回の確認以降に、新たに押されたキーがあることが判明した場合、その押されたキーの文字の情報を記録・保存します。この一連の流れを繰り返すことで、キーロガーは、ユーザが入力した文字列の情報を取得しているのです。

ポーリング型のキーロガーは、キーの入力状態をチェックするWindowsのAPIを利用して実装されており、代表的には [```GetAsyncKeyState```](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-getasynckeystate) APIが利用されます。このAPIは、特定のキーが現在押されているか否かに加えて、その特定のキーが前回のAPI呼び出し以降押されたか否かの情報を取得することが出来ます。以下が```GetAsyncKeyState``` APIを使ったポーリング型キーロガーの簡単な例です。

``` C
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

ポーリング(```GetAsyncKeyState```)を用いてキー押下状態を取得する手法は、古くから存在する典型的なキーロギングの手法として知られているだけでなく、今でもマルウェアによって使われていることが確認されています。
 
 2. フッキング型キーロガー
 
フッキング型キーロガーは、ポーリング型キーロガーと同じく、古くから存在する典型的な種類のキーロガーです。ここではまず「そもそもフックとは何か？」について説明します。

フックとは大雑把に言うと「アプリケーションの特定の処理に、独自の処理を割り込ませる仕組み」のことを指す言葉です。そして、フックを使って独自の処理を割り込ませることを「フックする」とも言います。Windowsでは、アプリケーションに対するキー入力などのメッセージ(イベント)をフックすることが出来る仕組みが用意されており、この仕組みは[SetWindowsHookEx](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-setwindowshookexa) APIを通じて利用することが出来ます。以下が```SetWindowsHookEx``` APIを使ったポーリング型キーロガーの簡単な例です。

``` C
HMODULE hHookLibrary = LoadLibraryW(L"hook.dll");
FARPROC hookFunc = GetProcAddress(hHookLibrary, "SaveTheKey");

HHOOK keyboardHook = NULL;
    
keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL,
                (HOOKPROC)hookFunc,
                hHookLibrary,
                0);
```

 3. Raw Input Modelを用いたキーロガー
 
このタイプのキーロガーは、キーボードなどの入力デバイスから得られた、生の入力データ(Raw Input)を取得し、それを保存・記録します。このキーロガーの詳細について説明する前に、まずWindowsにおける入力方式である「Original Input Model」と「Raw Input Model」について理解する必要があります。以下がそれぞれの入力方式についての説明です。

 - **Original Input Model**:  キーボードなどの入力デバイスから入力されたデータを、一度OSを介して必要な処理をした後、アプリケーション側に届ける方式
 - **Raw Input Model**:  キーボードなどの入力デバイスから入力されたデータを、そのままアプリケーション側が直接受け取る方式

Windowsでは当初、Original Input Modelのみが使われていました。しかしWindows XP以降に、おそらくは入力デバイスの多様化などの要因から、Raw Input Modelが導入されました。Raw Input Modelでは、[```RegisterRawInputDevices```](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-registerrawinputdevices) APIを使い、入力データを直接受け取りたい入力デバイスを登録します。そしてその後、[```GetRawInputData```](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-getrawinputdata)) APIを用いて生データを取得します。
以下がこれらのAPIを使った、Raw Input Modelを用いたキーロガーの簡単な例です。

``` C
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
        GetRawInputData((HRAWINPUT)lParam, RID_INPUT, NULL,
&dwSize, sizeof(RAWINPUTHEADER));

        buffer = (RAWINPUT*)HeapAlloc(GetProcessHeap(), 0, dwSize);

        if (GetRawInputData((HRAWINPUT)lParam, RID_INPUT, buffer, 
&dwSize, sizeof(RAWINPUTHEADER)))
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

この例では、最初に生入力を受け取りたい入力デバイスを```RegisterRawInputDevices```を用いて、登録します。ここでは、キーボードの生入力データを受け取るように設定・登録しています。

 4. ```DirectInput```を用いたキーロガー
 
最後に、```DirectInput```を用いたキーロガーについて説明します。このキーロガーは簡単に言えばMicrosoft DirectXの機能を悪用したキーロガーです。DirectXとは、ゲームや動画などのマルチメディア関連の処理を扱うためのAPI群の総称(ライブラリ)です。

ゲームにおいて、ユーザから各種入力が取得できることは必須機能と言って良いことから、DirectXにおいてもユーザの入力を処理するAPI群が提供されています。そして、DirectXのバージョン8以前に提供されていたそれらAPI群のことを「DirectInput」と呼びます。以下が```DirectInput```に関連するAPIを使ったキーロガーの簡単な例です。補足ですが、```DirectInput```を用いてキーを取得する際、裏では```RegisterRawInputDevices``` APIが呼ばれています。

``` C
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

## Windows API呼び出しを監視してキーロガーを検出する

Elastic Defendでは、Event Tracing for Windows (ETW ※4)を用いて、前述の種類のキーロガーを検知しています。具体的には、関連するWindows API群の呼び出しを監視し、その挙動のログを取得することで実現しています。監視するWindows API群と、付随して新規に作成したキーロガーの検知ルールは以下です。(※4 一言でいうとWindowsが提供する、アプリケーションやデバイスドライバなどのシステム側のコンポーネントを、トレースおよびロギングする仕組み。)

### 監視するWindows API群:

 - [GetAsyncKeyState](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate)
 - [SetWindowsHookEx](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowshookexw)
 - [RegisterRawInputDevice](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerrawinputdevices)

### 追加したキーロガー検知ルール一覧:

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

新規に追加した機能および検知ルールにより、Elastic Defendにてキーロガー・キーロギングの包括的な監視と検出が可能となり、これらの脅威に対するWindowsエンドポイントのセキュリティと保護の強化を実現しました。

### Windowsのキーロガーを検知する

次に実際の検知の様子をお見せします。例として、Raw Input Modelを用いたキーロガーをElastic Defendで検出してみます。ここでは```RegisterRawInputDevices``` APIを用いた簡易的なキーロガー「Keylogger.exe」を用意し、テスト環境で実行してみました※5。(※5 実行環境はWindows 10の執筆時点の最新版であるWindows 10 Version 22H2 19045.4412です。)

![Elastic Securityのアラート](/assets/images/protecting-your-devices-from-information-theft-keylogger-protection/image1.png)

キーロガーを実行した直後に、検知ルール([Keystroke Input Capture via ```RegisterRawInputDevices```](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/collection_keystroke_input_capture_via_registerrawinputdevices.toml))が発動し、エンドポイント側でアラートが上がりました。このアラートのさらなる詳細はKibana上から見ることが出来ます。

![Elastic Securityのアラートダッシュボード](/assets/images/protecting-your-devices-from-information-theft-keylogger-protection/image3.png)

以下が検知ルールの詳細です。検知に使われているAPIの部分を中心に説明します。

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

このアラートは簡単に言うと「署名されていないプロセス」または「署名されているが、その署名者が信頼できないプロセス」が、キー入力を取得する目的で```RegisterRawInputDevices```  APIを呼び出した時に発せられるアラートです。```RegisterRawInputDevices``` APIが呼び出された際の引数の情報に着目しており、より具体的にはAPIの第一引数である、[RAWINPUTDEVICE](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/ns-winuser-rawinputdevice)構造体のメンバの情報を検知に用いています。

この引数の値が、キーボード入力の取得を試みていることを示している場合、キーロガーが実行されたと見なして、アラートを上げるようになっています。 ```RegisterRawInputDevices``` APIのログはKibana上でも確認できます。

![Kibana上で確認できるRegisterRawInputDevices APIログ](/assets/images/protecting-your-devices-from-information-theft-keylogger-protection/image2.png)

### 各Windows APIの呼び出しの際に取得しているデータ

分量の都合で、追加したすべての検知ルールとAPIの詳細については本記事では説明しません。ですが最後に、対象のWindows APIの呼び出しの際にElastic Defend側で取得しているデータについて、簡単にご紹介します。各項目についてさらに知りたい方は、[custom_api.yml](https://github.com/elastic/endpoint-package/blob/main/custom_schemas/custom_api.yml)に記載されているElastic Common Schema（ECS）とのマッピングをご参照ください。

| API名 | フィールド | 説明(原文を日本語訳したもの) | 例 |
| --- | --- | --- | --- |
| GetAsyncKeyState | process.Ext.api.metadata.ms_since_last_keyevent | このパラメーターは、最後の GetAsyncKeyState イベントからの経過時間をミリ秒で示します。 | 94 |
| GetAsyncKeyState | process.Ext.api.metadata.background_callcount | このパラメーターは、最後に成功した GetAsyncKeyState 呼び出しからの間に行われた、失敗した呼び出しも含めたすべての GetAsyncKeyState API 呼び出しの回数を示します。 | 6021 |
| SetWindowsHookEx | process.Ext.api.parameters.hook_type | Tインストールするフックの種類 | "WH_KEYBOARD_LL"
| SetWindowsHookEx | process.Ext.api.parameters.hook_module | フック先の処理を保有するDLL | "c:\\windows\\system32\\taskbar.dll"
| SetWindowsHookEx | process.Ext.api.parameters.procedure | フック先となる処理や関数のメモリアドレス | 2431737462784 |
| SetWindowsHookEx | process.Ext.api.metadata.procedure_symbol | フック先の処理の要約 | "taskbar.dll" |
| RegisterRawInputDevices | process.Ext.api.metadata.return_value | RegisterRawInputDevices API 呼び出しの戻り値 | 1 |
| RegisterRawInputDevices | process.Ext.api.parameters.usage_page | このパラメーターはデバイスのトップレベルコレクション（Usage Page）を示す。RAWINPUTDEVICE 構造体の最初のメンバ | "GENERIC" |
| RegisterRawInputDevices | process.Ext.api.parameters.usage | このパラメーターは、Usage Page 内の特定のデバイス（Usage）を示します。RAWINPUTDEVICE 構造体の２番目のメンバ | "KEYBOARD" |
| RegisterRawInputDevices | process.Ext.api.parameters.flags | UsagePageとUsageによって提供される情報をどのように解釈するかを指定するモードフラグ。RAWINPUTDEVICE 構造体の３番目のメンバ | "INPUTSINK" |
| RegisterRawInputDevices | process.Ext.api.metadata.windows_count | 呼び出し元スレッドが所有するウィンドウの数 | 2 |
| RegisterRawInputDevices | process.Ext.api.metadata.visible_windows_count | 呼び出し元スレッドが所有する表示されているウィンドウの数 | 0 |
| RegisterRawInputDevices | process.Ext.api.metadata.thread_info_flags | スレッドの情報を表すフラグ | 16 |
| RegisterRawInputDevices | process.Ext.api.metadata.start_address_module | スレッドの開始アドレスに紐づくモジュールの名前 | "C:\\Windows\\System32\\DellTPad\\ApMsgFwd.exe" |
| RegisterRawInputDevices | process.Ext.api.metadata.start_address_allocation_protection | スレッドの開始アドレスに紐づくメモリ保護属性 | "RCX" |

## まとめ

本記事では、Elastic Defend 8.12にて導入された、Windows環境におけるキーロガーおよびキーロギング検知機能についてご紹介しました。具体的には、キーロギングに関連する代表的なWindows API群の呼び出しを監視することで、シグネチャに依存しない、振る舞い検知によるキーロガー検出を実現しました。精度を高め、誤検知率を減らすために、数ヶ月にわたる研究・調査をもとにこの機能と新しいルールを開発しました。

Elastic Defendではキーロガー関連のAPI以外にも、攻撃者に一般的に利用されるメモリ操作等の[API群なども監視すること](https://www.elastic.co/security-labs/doubling-down-etw-callstacks)で、多層的な防御を実現しております。Elastic Security および Elastic Defendについて気になった方はぜひ[製品ページ](https://www.elastic.co/jp/security)や[ドキュメント](https://www.elastic.co/jp/videos/intro-elastic-security)を御覧頂ければ幸いです。
