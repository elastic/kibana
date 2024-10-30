---
title: "Storm on the Horizon: Inside the AJCloud IoT Ecosystem"
slug: "storm-on-the-horizon"
date: "2024-09-20"
description: "Wi-Fi cameras are popular due to their affordability and convenience but often have security vulnerabilities that can be exploited."
author:
  - slug: mark-mager
  - slug: eric-forte
image: "storm-on-the-horizon.jpg"
category:
  - slug: security-research
  - slug: perspectives
tags:
  - iot
  - defcon
---

## Introduction

Wi-Fi cameras are some of the most common IoT devices found in households, businesses, and other public spaces. They tend to be quite affordable and provide users with easy access to a live video stream on their mobile device from anywhere on the planet. As is often the case with IoT devices, security tends to be overlooked in these cameras, leaving them open to critical vulnerabilities. If exploited, these vulnerabilities can lead to devastating effects on the cameras and the networks within which they’re deployed. They can lead to the compromise of the sensitive PII of their users.

A recent [Elastic ON Week](https://www.youtube.com/watch?v=qoojLdKJvkc) afforded us the opportunity to explore the attack surface of these types of devices to gain a deeper understanding of how they are being compromised. We focused primarily on performing vulnerability research on the [Wansview Q5](https://www.amazon.com/Wireless-Security-Wansview-Detection-Compatible/dp/B07QKXM2D3?th=1) (along with the nearly identical [Q6](https://www.wansview.com/q6)), one of the more popular and affordable cameras sold on Amazon. Wansview is a provider of security products based in Shenzhen, China, and one of Amazon's more prominent distributors of Wi-Fi cameras.

![](/assets/images/storm-on-the-horizon/image12.png "image_tooltip")

The Q5 offers the same basic feature set seen in most cameras:

* Pan / tilt / zoom
* Night vision
* Two-way audio
* Video recording to SD card
* Integration with Smart Home AI assistants (e.g. Alexa)
* ONVIF for interoperability with other security products
* RTSP for direct access to video feed within LAN
* Automated firmware updates from the cloud
* Remote technical support
* Shared device access with other accounts
* Optional monthly subscription for cloud storage and motion detection

Like most other Wi-Fi cameras, these models require an active connection to their vendor cloud infrastructure for basic operation; without access to the Internet, they simply will not operate. Before a camera can go live, it must be paired to a [registered user account](https://www.youtube.com/watch?v=UiF7xKnXfC0) via Wansview’s official mobile app and a standard [QR code-based setup process](https://youtu.be/PLMNKoO1214?si=G8sYxT3EagE3u_cw). Once this process is complete, the camera will be fully online and operational.

## AJCloud: A Brief Introduction

Though Wansview has been in operation [since 2009](https://www.wansview.com/about_company), at the moment they primarily appear to be a reseller of camera products built by a separate company based in Nanjing, China: [AJCloud](https://www.ajcloud.net).

![](/assets/images/storm-on-the-horizon/image19.png "image_tooltip")

AJCloud provides vendors with access to manufactured security devices, the necessary firmware, mobile and desktop user applications, the cloud management platform, and services that connect everything together. Since AJCloud was founded in 2018, they have partnered with several vendors, both large and small, including but not limited to the following:

* [Wansview](https://www.wansview.com)
* [Cinnado](https://cinnado.com)
* [Galayou](https://www.amazon.com/stores/GALAYOU/page/789538ED-82AC-43AF-B676-6622577A1982?ref_=ast_bln&store_ref=bl_ast_dp_brandLogo_sto)
* [Faleemi](https://www.faleemi.com)
* [Philips](https://www.philips.com)
* [Septekon](https://www.septekon.com)
* [Smarteye](https://www.smarteyegroup.com)
* [Homeguard](http://www.homeguardworld.com)
* [iPupPee](https://ipuppee.com)

A cursory review of mobile and desktop applications developed and published by AJCloud on [Google Play](https://play.google.com/store/apps/developer?id=AJCLOUD+INTERNATIONAL+INC.&hl=en_US), [Apple’s App Store](https://apps.apple.com/us/developer/ajcloud-labs-inc/id1396464400), and the [Microsoft Store](https://apps.microsoft.com/search/publisher?name=%E5%8D%97%E4%BA%AC%E5%AE%89%E5%B1%85%E4%BA%91%E4%BF%A1%E6%81%AF%E6%8A%80%E6%9C%AF%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8&hl=en-us&gl=US) reveals their ties to each of these vendors. Besides superficial company branding, these applications are identical in form and function, and they all require connectivity with the AJCloud management platform.

![](/assets/images/storm-on-the-horizon/image26.png "image_tooltip")

As for the cameras, it is apparent that these vendors are selling similar models with only minor modifications to the camera housing and underlying hardware.

![](/assets/images/storm-on-the-horizon/image16.png "image_tooltip")

![](/assets/images/storm-on-the-horizon/image9.png "image_tooltip")

The resemblance between the [Faleemi 886](https://www.faleemi.com/product/fsc886/) and the [Wansview Q6 (1080p)](https://www.youtube.com/watch?v=X5P5fGhRxAs) is obvious

Reusing hardware manufacturing and software development resources likely helps to control costs and simplify logistics for AJCloud and its resellers. However, this streamlining of assets also means that security vulnerabilities discovered in one camera model would likely permeate all products associated with AJCloud.

Despite its critical role in bringing these devices to consumers, AJCloud has a relatively low public profile. However, IPVM researchers recently [published](https://ipvm.com/reports/ajcloud-wansview-leak) research on a significant vulnerability (which has since been resolved) in AJCloud’s GitLab repository. This vulnerability would allow any user to access source code, credentials, certificates, and other sensitive data without requiring authentication.

Though total sales figures are difficult to derive for Wansview and other vendors in the Wi-Fi camera space, IPVM estimated that at least one million devices were connected to the AJCloud platform at the time of publication of their report. As camera sales [continue to soar](https://www.statista.com/forecasts/1301193/worldwide-smart-security-camera-homes) into the hundreds of millions, it is safe to assume that more of AJCloud’s devices will be connected in homes across the world for years to come.

## Initial Vulnerability Research Efforts

To gain a deeper understanding of the security posture of the Wansview Q5, we attacked it from multiple angles:

![](/assets/images/storm-on-the-horizon/image23.png "image_tooltip")

At first, our efforts were primarily focused on active and passive network reconnaissance of the camera and the [Android version](https://play.google.com/store/apps/details?id=net.ajcloud.wansviewplus&hl=en_US) of Wansview Cloud, Wansview’s official mobile app. We scanned for open ports, eavesdropped on network communications through man-in-the-middle (MitM) attacks, attempted to coerce unpredictable behavior from the cameras through intentional misconfiguration in the app, and disrupted the operation of the cameras by abusing the QR code format and physically interacting with the camera. The devices and their infrastructure were surprisingly resilient to these types of surface-level attacks, and our initial efforts yielded few noteworthy successes.

We were particularly surprised by our lack of success intercepting network communications on both the camera and the app. We repeatedly encountered robust security features (e.g., certificate pinning, app and OS version restrictions, and properly secured TLS connections) that disrupted our attempts.

![](/assets/images/storm-on-the-horizon/image13.png "image_tooltip")

Reverse engineering tools allowed us to analyze the APK much more closely, though the complexity of the code obfuscation observed within the decompiled Java source code would require an extended length of time to fully piece together.

Our limited initial success would require us to explore further options that would provide us with more nuanced insight into the Q5 and how it operates.

## Initial Hardware Hacking

To gain more insight into how the camera functioned, we decided to take a closer look at the camera firmware. While some firmware packages are available online, we wanted to take a look at the code directly and be able to monitor it and the resulting logs while the camera was running. To do this, we first took a look at the hardware diagram for the system on a chip (SoC) to see if there were any hardware avenues we might be able to leverage. The Wansview Q5 uses a [Ingenic Xburst T31 SoC](https://www.cnx-software.com/2020/04/26/ingenic-t31-ai-video-processor-combines-xburst-1-mips-and-risc-v-lite-cores/), its system block diagram is depicted below.

![](/assets/images/storm-on-the-horizon/image4.png "image_tooltip")

One avenue that stood out to us was the I2Cx3/UARTx2/SPIx2 SPI I/O block. If accessible, these I/O blocks often provide log output interfaces and/or shell interfaces, which can be used for debugging and interacting with the SoC. Appearing promising, we then performed a hardware teardown of the camera and found what appeared to be a UART serial interface to the SoC, shown below.

![](/assets/images/storm-on-the-horizon/image15.png "image_tooltip")

Next, we connected a logic analyzer to see what protocol was being used over these pins, and when decoded, the signal was indeed UART.

![](/assets/images/storm-on-the-horizon/image33.png "image_tooltip")

Now that we can access an exposed UART interface, we then looked to establish a shell connection to the SoC via UART. There are a number of different software mechanisms to do this, but for our purposes we used the Unix utility `screen` with the detected baud rate from the logic analyzer. 

![](/assets/images/storm-on-the-horizon/image11.png "image_tooltip")

Upon opening and monitoring the boot sequence, we discovered that secure boot was not enabled despite being supported by the SoC. We then proceeded to modify the configuration to boot into single user mode providing a root shell for us to use to examine the firmware before the initialization processes were performed, shown below. 

![](/assets/images/storm-on-the-horizon/image29.png "image_tooltip")

Once in single-user mode, we were able to pull the firmware files for static analysis using the `binwalk` utility, as shown below. 

![](/assets/images/storm-on-the-horizon/image32.png "image_tooltip")

At this stage, the filesystem is generally read-only; however, we wanted to be able to make edits and instantiate only specific parts of the firmware initialization as needed, so we did some quick setups for additional persistence beyond single-user mode access. This can be done in a number of ways, but there are two primary methods one may wish to use. Generally speaking, in both approaches, one will want to make as few modifications to the existing configuration as possible. This is generally preferred when running dynamic analysis if possible, as we have had the least impact on the run time environment. One method we used for this approach is to make a `tmpfs` partition for read/write access in memory and mount it via `fstab`. In our case `fstab` was already considered in such a way that supported this, and as such made it a very minimal change. See the commands and results for this approach below.

![](/assets/images/storm-on-the-horizon/image17.png "image_tooltip")

Another method is to pull existing user credentials and attempt to use these to log in. This approach was also successful. The password hash for the root user can be found in the `etc/passwd` file and decrypted using a tool like John the Ripper. In our above examples, we were transferring data and files entirely over the serial connection. The camera also has an available SD card slot that can be mounted and used to transfer files. Going forward, we will be using the SD card or local network for moving files as the bandwidth makes for faster and easier transfer; however, serial can still be used for all communications for the hardware setup and debugging if preferred.

Now, we have root level access to the camera providing access to the firmware and dmesg logs while the software is running. Using both the firmware and logs as reference, we then looked to further examine the user interfaces for the camera to see if there was a good entry point we could use to gain further insight.

## Wansview Cloud for Windows

After the mobile apps proved to be more secure than we had originally anticipated, we shifted our focus to an older version of the Wansview Cloud application built for Windows 7. This app, which is still [available for download](https://www.wansview.com/support_download), would provide us with direct insight into the network communications involved with cameras connected to the AJCloud platform.

Thanks in large part to overindulgent debug logging on behalf of the developers, the Windows app spills out its secrets with reckless abandon seldom seen in commercial software. The first sign that things are amiss is that user login credentials are logged in cleartext.

![](/assets/images/storm-on-the-horizon/image24.png "image_tooltip")

Reverse engineering the main executable and DLLs (which are not packed, unlike the Wansview Cloud APK) was expedited thanks to the frequent use of verbose log messages containing unique strings. Identifying references to specific files and lines within its underlying codebase helped us to quickly map out core components of the application and establish the high level control flow.

Network communications, which were difficult for us to intercept on Android, are still transmitted over TLS, though they are conveniently logged to disk in cleartext. With full access to all HTTP POST request and response data (which is packed into JSON objects), there was no further need to pursue MitM attacks on the application side. 

![POST request to https://sdc-portal.ajcloud.net/api/v1/app-startup](/assets/images/storm-on-the-horizon/image8.png "POST request to https://sdc-portal.ajcloud.net/api/v1/app-startup")

![POST response from https://sdc-portal.ajcloud.net/api/v1/app-startup](/assets/images/storm-on-the-horizon/image25.png "POST response from https://sdc-portal.ajcloud.net/api/v1/app-startup")

Within the POST responses, we found sensitive metadata including links to publicly accessible screen captures along with information about the camera’s location, network configuration, and its firmware version.

![https://cam-snapshot-use1.oss-us-east-1.aliyuncs.com/f838ee39636aba95db7170aa321828a1/snapshot.jpeg](/assets/images/storm-on-the-horizon/image1.jpg "https://cam-snapshot-use1.oss-us-east-1.aliyuncs.com/f838ee39636aba95db7170aa321828a1/snapshot.jpeg")

![POST response from https://cam-gw-us.ajcloud.net/api/v1/fetch-infos](/assets/images/storm-on-the-horizon/image10.png "POST response from https://cam-gw-us.ajcloud.net/api/v1/fetch-infos")

After documenting all POST requests and responses found within the log data, we began to experiment with manipulating different fields in each request in an attempt to access data not associated with our camera or account. We would eventually utilize a debugger to change the deviceId to that of a target camera not paired with the current logged in account. A camera deviceId doubles as its serial number and can be found printed on a sticker label located on either the back or bottom of a camera.

![](/assets/images/storm-on-the-horizon/image2.png "image_tooltip")

We found the most appropriate target for our attack in a code section where the deviceId is first transmitted in a POST request to [https://sdc-us.ajcloud.net/api/v1/dev-config](https://sdc-us.ajcloud.net/api/v1/dev-config):

![](/assets/images/storm-on-the-horizon/image31.png "image_tooltip")

Our plan was to set a breakpoint at the instruction highlighted in the screenshot above, swap out the deviceId within memory, and then allow the app to resume execution.

Amazingly enough, this naive approach not only worked to retrieve sensitive data stored in the AJCloud platform associated with the target camera and the account it is tied to, but it also connected us to the camera itself. This allowed us to access its video and audio streams and remotely control it through the app as if it were our own camera.

Through exploiting this vulnerability and testing against multiple models from various vendors, we determined that all devices connected to the AJCloud platform could be remotely accessed and controlled in this manner. We wrote a [PoC exploit script](https://github.com/elastic/camera-hacks/blob/main/windows/win_exploit.py) to automate this process and effectively demonstrate the ease with which this access control vulnerability within AJCloud’s infrastructure can be trivially exploited.

## Exploring the network communications

Though we were able to build and reliably trigger an exploit against a critical vulnerability in the AJCloud platform, we would need to dig further in order to gain a better understanding of the inner workings of the apps, the camera firmware, and the cloud infrastructure.

As we explored beyond the POST requests and responses observed throughout the sign-in process, we noticed a plethora of UDP requests and responses from a wide assortment of IPs. Little in the way of discernible plaintext data could be found throughout these communications, and the target UDP port numbers for the outbound requests seemed to vary. Further investigation would later reveal that this UDP activity was indicative of PPPP, an IoT peer-to-peer (P2P) protocol that was analyzed and demonstrated extensively by Paul Marrapesse during his [presentation at DEF CON 28](https://youtu.be/Z_gKEF76oMM?si=cqCBU6iPxCyEm-xm). We would later conclude that the way in which we exploited the vulnerability we discovered was facilitated through modified P2P requests, which led us to further explore the critical role that P2P plays in the AJCloud platform.

![](/assets/images/storm-on-the-horizon/image22.png "image_tooltip")

The main purpose of P2P is to facilitate communication between applications and IoT devices, regardless of the network configurations involved. P2P primarily utilizes an approach based around [UDP hole punching](https://en.wikipedia.org/wiki/UDP_hole_punching) to create temporary communication pathways that allow requests to reach their target either directly or through a relay server located in a more accessible network environment. The core set of P2P commands integrated into AJCloud’s apps provides access to video and audio streams as well as the microphone and pan/tilt/zoom.

## Advanced Hardware Hacking

With our additional understanding of the P2P communications, it was now time to examine the camera itself more closely during these P2P conversations, including running the camera software in a debugger. To start, we set up the camera with a live logging output via the UART serial connection that we established earlier, shown below.

![](/assets/images/storm-on-the-horizon/image5.png "image_tooltip")

This provided a live look at the log messages from the applications as well as any additional logging sources we needed. From this information, we identified the primary binary that is used to establish communication between the camera and the cloud as well as providing the interfaces to access the camera via P2P. 

This binary is locally called initApp, and it runs once the camera has been fully initialized and the boot sequence is completed. Given this, we set out to run this binary with a debugger to better evaluate the local functions. In attempting to do so, we encountered a kernel watchdog that detected when initApp was not running and would forcibly restart the camera if it detected a problem. This watchdog checks for writes to `/dev/watchdog` and, if these writes cease, will trigger a timer that will reboot the camera if the writes do not resume. This makes debugging more difficult as when one pauses the execution of initApp, the writes to the watchdog pause as well. An example of this stopping behavior is shown below:

![](/assets/images/storm-on-the-horizon/image18.png "image_tooltip")

To avoid this, one could simply try writing to the watchdog whenever initApp stops to prevent the reboot. However, another cleaner option is to make use of the magic close feature of the [Linux Kernel Watchdog Driver API](https://www.kernel.org/doc/Documentation/watchdog/watchdog-api.txt). In short, if one writes a specific magic character ‘V’ `/dev/watchdog` the watchdog will be disabled. There are other methods of defeating the watchdog as well, but this was the one we chose for our research as it makes it easy to enable and disable the watchdog at will.

With the watchdog disabled, setting up to debug initApp is fairly straightforward. We wanted to run the code directly on the camera, if possible, instead of using an emulator. The architecture of the camera is Little Endian MIPS (MIPSEL). We were fortunate that pre-built GDB and GDBServer binaries were able to function without modification; however, we did not know this initially, so we also set up a toolchain to compile GDBServer specifically for the camera. One technique that might be useful if you find yourself in a similar situation is to use a compilation tool like gcc to compile some source code to your suspected target architecture and see if it runs; see the example below.

![](/assets/images/storm-on-the-horizon/image25.png "image_tooltip")

In our case, since our SoC was known to us, we were fairly certain of the target architecture; however, in certain situations, this may not be so simple to discover, and working from hello world binaries can be useful to establish an initial understanding. Once we were able to compile binaries, we then compiled GDBServer for our camera and then used it to attach and launch initApp. Then, we connected to it from another computer on the same local network as the camera. An example of this is shown below:

![](/assets/images/storm-on-the-horizon/image7.png "image_tooltip")

As a note for the above example, we are using the `-x` parameter to pass in some commands for convenience, but they are not necessary for debugging. For more information on any of the files or commands, please see our [elastic/camera-hacks](https://github.com/elastic/camera-hacks/tree/main) GitHub repo. In order for initApp to load properly, we also needed to ensure that the libraries used by the binary were accessible via the `PATH` and `LD_LIBARY_PATH` environment variables. With this setup, we were then able to debug the binary as we needed. Since we also used the magic character method of defeating the watchdog earlier we also will need to make sure to control instances where the watchdog can be re-enabled. In most cases, we do not want this to happen. As such, we overwrote the watchdog calls in initApp so that the watchdog would not be re-enabled while we were debugging, as shown below.

![](/assets/images/storm-on-the-horizon/image3.png "image_tooltip")

The following video shows the full setup process from boot to running GDBServer. In the video, we also start a new initApp process, and as such, we need to kill both the original process and the `daemon.sh` shell script that will spawn a new initApp process if it is killed.

![](/assets/images/storm-on-the-horizon/video1.gif)

## Building a P2P Client

In order to further explore the full extent of capabilities which P2P provides to AJCloud IoT devices and how they can be abused by attackers, we set out to build our own standalone client. This approach would remove the overhead of manipulating the Wansview Cloud Windows app while allowing us to more rapidly connect to cameras and test out commands we derive from reverse engineering the firmware.

From the configuration data we obtained earlier from the Windows app logs, we knew that a client issues requests to up to three different servers as part of the connection process. These servers provide instructions to clients as to where traffic should be routed in order to access a given camera. If you would like to discover more of these servers out in the open, you can scan the Internet using the following four-byte UDP payload on port `60722`. Paul Marrapese used this technique to great effect as part of his research.

![](/assets/images/storm-on-the-horizon/image34.png "image_tooltip")

![](/assets/images/storm-on-the-horizon/image6.png "image_tooltip")

In order to properly establish a P2P connection, a client must first send a simple hello message (`MSG_HELLO`), which needs to be ACK’d (`MSG_HELLO_ACK`) by a peer-to-peer server. The client then queries the server (`MSG_P2P_REQ`) for a particular deviceId. If the server is aware of that device, then it will respond (`MSG_PUNCH_TO`) to the client with a target IP address and UDP port number pair. The client will then attempt to connect (`MSG_PUNCH_PKT`) to the IP and port pair along with other ports [within a predetermined range](https://github.com/elastic/camera-hacks/blob/deb2abe9a7a1009c5c1b7d34584f143d5b62c82e/p2p/p2p_client.py#L247-L260) as part of a [UDP hole punching](https://en.wikipedia.org/wiki/UDP_hole_punching) routine. If successful, the target will send a message (`MSG_PUNCH_PKT`) back to the client along with a final message (`MSG_P2P_RDY`) to confirm that the connection has been established.

![](/assets/images/storm-on-the-horizon/image28.gif "image_tooltip")

After connecting to a camera, we are primarily interested in sending different `MSG_DRW` packets and observing their behavior. These packets contain commands which will allow us to physically manipulate the camera, view and listen to its video and audio streams, access data stored within it, or alter its configuration. The most straightforward command we started with involved panning the camera counter clockwise, which we could easily identify as a single message transmission.

![](/assets/images/storm-on-the-horizon/image30.png "image_tooltip")

Debug log messages on the camera allowed us to easily locate where this command was processed within the firmware.

![](/assets/images/storm-on-the-horizon/image20.png "image_tooltip")

Locating the source of this particular message placed us in the main routine which handles processing MSG_DRW messages, which provided us with critical insight into how this command is invoked and what other commands are supported by the firmware.

![](/assets/images/storm-on-the-horizon/image14.png "image_tooltip")

Extensive reverse engineering and testing allowed us to build a [PoC P2P client](https://github.com/elastic/camera-hacks/blob/main/p2p/p2p_client.py) which allows users to connect to any camera on the AJCloud platform, provided they have access to its deviceId. Basic commands supported by the client include camera panning and tilting, rebooting, resetting, playing audio clips, and even crashing the firmware.

The most dangerous capability we were able to implement was through a command which modifies a core device configuration file: `/var/syscfg/config_default/app_ajy_sn.ini`. On our test camera, the file’s contents were originally as follows:

```
[common]
product_name=Q5
model=NAV
vendor=WVC
serialnum=WVCD7HUJWJNXEKXF
macaddress=
wifimacaddress=
```

While this appears to contain basic device metadata, this file is the only means through which the camera knows how to identify itself. Upon startup, the camera reads in the contents of this file and then attempts to connect to the AJCloud platform through a series of curl requests to various API endpoints. These curl requests pass along the product name, camera model, vendor code, and serial number values extracted from the INI file as query string arguments. We used our client to deliver a message which overwrites the contents like so:

```
[common]
product_name=
model=OPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~HH01
vendor=YZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~HH01
serialnum=defghijklmnopqrstuvwxyz{|}~HH01
macaddress=
wifimacaddress=
```

After the camera is reset, all curl requests issued to AJCloud platform API endpoints as part of the startup routine will fail due to the malformed data contained within the INI file. These requests will continue to periodically be sent, but they will never succeed and the camera will remain inactive and inaccessible through any apps. Unfortunately, there is no simple way to restore the previous file contents through resetting the camera, updating its firmware, or restoring the factory settings. File modifications carried out through this command will effectively brick a camera and render it useless.

<iframe src="https://drive.google.com/file/d/1oK_umHYfScza-F5RQNUGgFe3GFOt5n--/preview" width="640" height="480" allow="autoplay"></iframe>

Taking a closer look at the decompiled function (`syscfg_setAjySnParams`) which overwrites the values stored in `app_ajy_sn.ini`, we can see that input parameters, extracted from the `MSG_DRW` command are used to pass along string data which will be used to overwrite the model, vendor, and serial number fields in the file. memset is used to overwrite three global variables, intended to store these input strings, with null bytes. strcpy is then used to transfer the input parameters into these globals. In each instance, this will result in bytes being copied directly from the `MSG_DRW` command buffer until it encounters a null character.

![](/assets/images/storm-on-the-horizon/image21.png "image_tooltip")

Because no validation is enforced on the length of these input parameters extracted from the command, it is trivial to craft a message of sufficient length which will trigger a buffer overflow. While we did not leverage this vulnerability as part of our attack to brick the camera, this appears to be an instance where an exploit could be developed which would allow for an attacker to achieve remote code execution on the camera.

## Impact

We have confirmed that a broad range of devices across several vendors affiliated with AJCloud and several different firmware versions are affected by these vulnerabilities and flaws. Overall, we successfully demonstrated our attacks against fifteen different camera products from Wansview, Galayou, Cinnado, and Faleemi. Based on our findings, it is safe to assume that all devices which operate AJCloud firmware and connect to the AJCloud platform are affected.

All attempts to contact both AJCloud and Wansview in order to disclose these vulnerabilities and flaws were unsuccessful.

## What did the vendors do right?

Despite the vulnerabilities we discovered and discussed previously, there are a number of the security controls that AJCloud and the camera vendors implemented well. For such a low cost device, many best practices were implemented. First, the network communications are secured well using certificate based WebSocket authentication. In addition to adding encryption, putting many of the API endpoints behind the certificate auth makes man in the middle attacks significantly more challenging. Furthermore, the APKs for the mobile apps were signed and obfuscated making manipulating these apps very time consuming. 

Additionally, the vendors also made some sound decisions with the camera hardware and firmware. The local OS for the camera is effectively limited, focusing on just the needed functionality for their product. The file system is configured to be read only, outside of logging, and the kernel watchdog is an effective method of ensuring uptime and reducing risk of being stuck in a failed state. The Ingenic Xburst T31 SoC, provides a capable platform with a wide range of support including secure boot, a Power-On Reset (POR) watchdog, and a separate RISC-V processor capable of running some rudimentary machine learning on the camera input.

## What did the vendors do wrong?

Unfortunately, there were a number of missed opportunities with these available features. Potentially the most egregious is the unauthenticated cloud access. Given the API access controls established for many of the endpoints, having the camera user access endpoints available via serial number without authentication is a huge and avoidable misstep. The P2P protocol is also vulnerable as we showcased, but compared to the API access which should be immediately fixable, this may take some more time to fix the protocol. It is a very dangerous vulnerability, but it is a little bit more understandable as it requires considerably more time investment to both discover and fix. 

From the application side, the primary issue is with the Windows app which has extensive debug logging which should have been removed before releasing publicly. As for the hardware, it can be easily manipulated with physical access (exposed reset button, etc.). This is not so much an issue given the target consumer audience. It is expected to err on the side of usability rather than security, especially given physical access to the device. On a similar note, secure boot should be enabled, especially given that the T31 SoC supports it. While not strictly necessary, this would make it much harder to debug the source code and firmware of the device directly, making it more difficult to discover vulnerabilities that may be present. Ideally it would be implemented in such a way that the bootloader could still load an unsigned OS to allow for easier tinkering and development, but would prevent the signed OS from loading until the boot loader configuration is restored. However, one significant flaw in the current firmware is the dependence on the original serial number that is not stored in a read only mount point while the system is running. Manipulating the serial number should not permanently brick the device. It should either have a mechanism for requesting a new serial number (or restoring its original serial number) should its serial number be overwritten, or the serial number should be immutable. 

## Mitigations

Certain steps can be taken in order to reduce the attack surface and limit potential adverse effects in the event of an attack, though they vary in their effectiveness.

Segmenting Wi-Fi cameras and other IoT devices off from the rest of your network is a highly recommended countermeasure which will prevent attackers from pivoting laterally to more critical systems. However, this approach does not prevent an attacker from obtaining sensitive user data through exploiting the access control vulnerability we discovered in the AJCloud platform. Also, considering the ease in which we were able to demonstrate how cameras could be accessed and manipulated remotely via P2P, any device connected to the AJCloud platform is still at significant risk of compromise regardless of its local network configuration.

Restricting all network communications to and from these cameras would not be feasible due to how essential connectivity to the AJCloud platform is to their operation. As previously mentioned, the devices will simply not operate if they are unable to connect to various API endpoints upon startup.

A viable approach could be restricting communications beyond the initial startup routine. However, this would prevent remote access and control via mobile and desktop apps, which would defeat the entire purpose of these cameras in the first place. For further research in this area, please refer to “[Blocking Without Breaking: Identification and Mitigation of Non-Essential IoT Traffic](https://petsymposium.org/popets/2021/popets-2021-0075.pdf)”, which explored this approach more in-depth across a myriad of IoT devices and vendors.

The best approach to securing any Wi-Fi camera, regardless of vendor, while maintaining core functionality would be to flash it with alternative open source firmware such as [OpenIPC](https://openipc.org) or [thingino](https://thingino.com). Switching to open source firmware avoids the headaches associated with forced connectivity to vendor cloud platforms by providing users with fine grain control of device configuration and remote network accessibility. Open access to the firmware source helps to ensure that critical flaws and vulnerabilities are quickly identified and patched by diligent project contributors.

## Key Takeaways

Our research revealed several critical vulnerabilities that span all aspects of cameras operating AJCloud firmware which are connected to their platform. Significant flaws in access control management on their platform and the PPPP peer protocol provides an expansive attack surface which affects millions of active devices across the world. Exploiting these flaws and vulnerabilities leads to the exposure of sensitive user data and provides attackers with full remote control of any camera connected to the AJCloud platform. Furthermore, a built-in P2P command, which intentionally provides arbitrary write access to a key configuration file, can be leveraged to either permanently disable cameras or facilitate remote code execution through triggering a buffer overflow.

Please visit our [GitHub repository](https://github.com/elastic/camera-hacks) for custom tools and scripts we have built along with data and notes we have captured which we felt would provide the most benefit to the security research community.
