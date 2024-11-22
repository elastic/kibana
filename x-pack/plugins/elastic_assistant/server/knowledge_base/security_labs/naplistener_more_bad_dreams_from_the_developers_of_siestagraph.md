---
title: "NAPLISTENER: more bad dreams from developers of SIESTAGRAPH"
slug: "naplistener-more-bad-dreams-from-the-developers-of-siestagraph"
date: "2023-06-27"
description: "Elastic Security Labs observes that the threat behind SIESTAGRAPH has shifted priorities from data theft to persistent access, deploying new malware like NAPLISTENER to evade detection."
author:
  - slug: remco-sprooten
image: "blog-thumb-filtered-lens.jpg"
category:
  - slug: malware-analysis
tags:
  - malware analysis
  - naplisitener
  - siestagraph
---

### Introduction

While continuing to monitor the [REF2924](https://www.elastic.co/security-labs/siestagraph-new-implant-uncovered-in-asean-member-foreign-ministry) activity group, Elastic Security Labs observed that the attacker shifted priorities from data theft to persistent access using several mechanisms. On January 20, 2023, a new executable `Wmdtc.exe` was created and installed as a Windows Service using a naming convention similar to the legitimate binary used by the Microsoft Distributed Transaction Coordinator service ( `Msdtc.exe` ).

`Wmdtc.exe` is an HTTP listener written in C#, which we refer to as NAPLISTENER. Consistent with SIESTAGRAPH and other malware families developed or used by this threat, NAPLISTENER appears designed to evade network-based forms of detection. _Notably, network- and log-based detection methods are common in the regions where this threat is primarily active (southern and southeastern asia)._

### Analysis

This unique malware sample contains a C# class called `MsEXGHealthd` that consists of three methods: `Main` , `SetRespHeader` , and `Listener`. This class establishes an HTTP request listener that can process incoming requests from the Internet, and respond accordingly by filtering malware commands and transparently passing along legitimate web traffic. This class is depicted in the following image:

![NAPLISTENER MsEXGHealthd class](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image3.jpg)

### Malware analysis

The `Main` method is invoked when the program runs and creates a thread object, which will be used by the `Listener` method. The thread is then put to sleep for 0 milliseconds, and then started. Implementing a sleep capability is consistent with SIESTAGRAPH, NAPLISTENER, and other malware developed or used by this group.

The `SetRespHeader` method sets the response headers for the HTTP response. It takes an `HttpListenerResponse` object as a parameter and defines headers such as `Server` , `Content-Type` , and `X-Powered-By`. In one aggressively-targeted victim environment, the IIS web server returns a 404 response with a `Server` header containing `Microsoft-IIS/10.0` as seen below, unless specific parameters are present:

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image6.jpg)

However, the 404 error when requesting the listener URI adds `Content-Type: text/html; charset=utf-8` as an extra header. When NAPLISTENER is installed, the string `Microsoft-HTTPAPI/2.0` is appended to the Server header. This behavior makes the listener detectable and does not generate a 404 error. It is likely this filtering methodology was chosen to avoid discovery by web scanners and similar technologies.

Defenders may instinctively search for these errors in IIS web server logs, but the NAPLISTENER implant functions inline and Windows will redirect these requests to the registered application, allowing the malware to ensure those errors never reach the web server logs where analysts may see them. Additionally, security tools that ingest web server logs will not have an opportunity to identify these behaviors.

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image5.jpg)

The `Listener` method is where most of the work happens for NAPLISTENER.

First, this method creates an `HttpListener` object to handle incoming requests. If `HttpListener` is supported on the platform being used (which it should be), it adds a prefix to the listener and starts it.

Once running, it waits for incoming requests. When a request comes in, it reads any data that was submitted (stored in a `Form` field), decodes it from Base64 format, and creates a new `HttpRequest` object with the decoded data. It creates an `HttpResponse` object and an `HttpContext` object, using these two objects as parameters. If the submitted Form field contains `sdafwe3rwe23` , it will try to create an assembly object and execute it using the `Run` method.

This means that any web request to `/ews/MsExgHealthCheckd/` that contains a base64-encoded .NET assembly in the `sdafwe3rwe23` parameter will be loaded and executed in memory. It's worth noting that the binary runs in a separate process and it is not associated with the running IIS server directly.

If that fails for some reason (e.g., invalid or missing data), then a "404 Not Found" response will be sent with an empty body instead . After either response has been sent, the stream is flushed and the connection closed before looping back to wait for more incoming requests.

### Proof-of-concept prerequisites

_Attention: Please remember that this is meant as a proof-of-concept to illustrate how NAPLISTENER must be prepared for a target environment: it should not be deployed in production environments for any reason._

In order to properly run NAPLISTENER, an SSL certificate must be generated and the application registered to use it on a target endpoint. A general example of generating a self-signed certificate resembles the following commands:

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image7.jpg)

The adversary needs to then Import the `certificate.pfx` object into the windows certificate store, as depicted in the following image:

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image2.jpg)

Each certificate contains a thumbprint, and the following screen capture depicts an example certificate:

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image1.jpg)

The thumbprint value is necessary to register the application as seen in the following command:

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/Screenshot_2023-03-19_at_3.14.31_PM.jpg)

The adversary needs to replace the `certhash` value with the thumbprint from their certificate. The `appid` is the GUID of the sample application ID. Once the environment is properly configured, the sample can be run from any privileged terminal.

The following python script created by Elastic Security Labs demonstrates one method that can then be used to trigger NAPLISTENER. The payload in this example is truncated for readability, and may be released at a later time when the industry has better ability to detect this methodology.

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/Screenshot_2023-03-19_at_3.15.37_PM.jpg)

In our PoC, running the python script results in a harmless instance of `calc.exe`.

![](/assets/images/naplistener-more-bad-dreams-from-the-developers-of-siestagraph/image4.jpg)

### Resources

Elastic Security Labs has published a NAPLISTENER signature to the open protections artifact repository [here](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_NapListener.yar).

### Sources

Code similarity analyses are an important part of our process. During our investigation of NAPLISTENER, we identified a public [GitHub repository](https://github.com/A-D-Team/SharpMemshell/blob/main/HttpListener/memshell.cs) that contains a similar project. Similar logic and identical debugging strings are present in both pieces of code, and we assess that `SharpMemshell` may have inspired the threat responsible for NAPLISTENER.

### Key takeaways

- The attacker has shifted their focus from data theft to establishing persistent access using new malware including NAPLISTENER, an HTTP listener written in C#
- NAPLISTENER creates an HTTP request listener that can process incoming requests from the internet, reads any data that was submitted, decodes it from Base64 format, and executes it in memory
- NAPLISTENER is designed to evade network-based detection methods by behaving similarly to web servers
- The attacker relies on code present in public repositories for a variety of purposes, and may be developing additional prototypes and production-quality code from open sources
