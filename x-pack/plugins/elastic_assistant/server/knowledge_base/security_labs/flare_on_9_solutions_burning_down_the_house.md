---
title: "FLARE-ON 9 Solutions:"
slug: "flare-on-9-solutions-burning-down-the-house"
date: "2023-01-04"
subtitle: "Burning down the house"
description: "This year's FLARE-ON consisted of 11 different reverse engineering challenges with a range of interesting binaries. We really enjoyed working on these challenges and have published our solutions here to Elastic Security Labs."
author:
  - slug: daniel-stepanic
  - slug: cyril-francois
  - slug: salim-bitam
  - slug: remco-sprooten
image: "illustration-endpoint-security-stop-malware-1284x926.jpg"
category:
tags:
  - malware analysis
  - reverse-engineering
---

## Introduction

To celebrate cybersecurity month, the Malware Analysis and Reverse Engineering Team (MARE) enjoyed participating in the Mandiant [FLARE-ON Challenge](https://www.mandiant.com/resources/blog/announcing-ninth-flareon-challenge). FLARE-ON is an excellent event for participants of all backgrounds and experience levels who want to learn more about malware analysis. This year consisted of 11 different reverse engineering challenges with a range of interesting binaries. We really enjoyed working on these challenges and have published our solutions here to Elastic Security Labs.

### Challenge 1 - “Flaredle”

> Welcome to FLARE-ON 9! You probably won't win. Maybe you're like us and spent the year playing Wordle. We made our own version that is too hard to beat without cheating. Play it live at: [http://flare-on.com/flaredle/](http://flare-on.com/flaredle/)

#### Solution

After downloading and unpacking the file, we see 4 file objects. ![](/assets/images/flare-on-9-solutions-burning-down-the-house/image9.jpg)

The index.html file and accompanying js files give away what we are talking about is a HTML/JavaScript challenge. Opening the file script.js confirms our suspicion. In the first few lines of code the answer to the challenge is clear to the trained eye. Let’s explain.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image72.jpg)

On line 9 the value of **rightGuessString** translates to WORDS[57]. Even if you don't know javascript, the variables and iterative loop suggest an evaluation of the user-supplied guess (rightGuessString) and a hard-coded value. If we look at the contents of words.js, we see the correct value on the 58th line (javascript arrays begin with 0 but the file start at line 1): "flareonisallaboutcats".

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image97.jpg)

By visiting the online game and submitting this string, we can validate the correct flag for challenge one!

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image27.jpg)

**Flag:** [flareonisallaboutcats@flare-on.com](mailto:flareonisallaboutcats@flare-on.com)

## Challenge 2 - “Pixel Poker”

> I said you wouldn't win that last one. I lied. The last challenge was basically a captcha. Now the real work begins. Shall we play another game?

### Solution

This challenge consists of a 32-bit Windows application that has been sweeping the nation, called Pixel Poker! Users get 10 attempts to click on the correct pixel from the window before the program terminates.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image8.jpg)

The error message after 10 failed attempts provided a reliable lead to follow, and we focused on where that click restriction was implemented. We converted that decimal value of 10 into hexadecimal (0xA) and kicked off an immediate value search.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image88.jpg)

The first result from our search is listed with instructions: **cmp eax, 10**. You might not be fluent in assembly, but “cmp” is a mathematical instruction to compare the contents of “eax” with the number ten. At first glance, that looks like the kind of logic behind that click restriction.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image98.jpg)

By viewing the decompiled code, we can confirm this is our intended target instruction with the error message we saw on prior screenshot after the 10 attempts. We’re one step closer to knowing where to click in the window.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image78.jpg)

In order to locate the validation logic and those coordinates, we look at code in close proximity to the previous error message. We observe two instances where the EAX register is populated using strings (“FLAR”) and (“E-On”) that then get divided with hardcoded values and compared with our clicked pixel values.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image12.jpg)

After these straightforward operations, we derive two coordinates (95, 313). If you are up for a challenge and haven’t had too much coffee, go on and click that pixel.

The flag can also be attained by leveraging a debugger and enabling the zero-flag (ZF) on two JNZ (jump-if-not-zero) instructions that appear directly after the previously-mentioned compare checks. This method allows us to bypass manually clicking the correct pixel location.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image68.jpg)

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image64.jpg)

For fun, we wrote a small program to patch out the click restriction and brute force clicking all available pixels using the SendMessage API.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image4.jpg)

Two minutes and about 100,000 clicks later, the flag was released to us.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image55.jpg)

\*_Flag: \*\_w1nN3r_W!NneR_[cHick3n_d1nNer@flare-on.com](mailto:cHick3n_d1nNer@flare-on.com)

## Challenge 3 - “Magic 8 Ball”

> You got a question? Ask the 8 ball!

### Solution

This challenge appeared to be an interactive 8-ball game developed with an open source SDL [library](https://www.libsdl.org/). Based on quick observations, there are two obvious inputs moving the 8-ball directionally (left, up, down, right) and an input box with a maximum of 75 characters.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image75.jpg)

The first starting point was tracing the string “Press arrow keys to shake the ball” that was displayed in the application. The decompiled view of the function containing this string showed another string directly above it was being copied (“gimme flag pls?”).

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image82.jpg)

Our next pivot was reviewing the code calling this function for more context. After the software executes and the game is displayed, a “do while” loop polls for input.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image87.jpg)

One function we reviewed stood out, one containing multiple “if then” conditional statements based on single character values.

Our malware analysts begin their careers in childhood, diligently playing video games for literally hours at a time– to them this pattern resembles the [Konami](https://en.wikipedia.org/wiki/Konami_Code) code, by which players enabled undocumented features after entering a series of inputs (left, left, up, right, up, left, down, up, left).

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image30.jpg)

By moving the 8-ball first in this order of operations and then entering the previously-recovered string (“gimme flag pls?”), we unlocked the flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image85.jpg)

**Flag:** U*cRackeD_th1$\_maG1cBaLL*!! [\_@flare-on.com](mailto:_@flare-on.com)

## Challenge 4 - “darn_mice”

> "If it crashes it's user error." -Flare Team

### Solution

The fourth challenge was a 32bit PE binary. Executed without any arguments, the binary initially appeared to run briefly before terminating. When run with arguments, though, we see a strange error message.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image2.jpg)

After opening the binary in IDA and tracing that error, we determined that the first argument is being passed to the function sub_401000.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image23.jpg)

In this function we see that our input is added to the values of a constant array, and at line 51 we see that the result is executed as code. This means that our input and the value in the array are resolved as an opcode which is returned. And that means a NOP opcode (0x90) isn’t an option, if you’re following along. The opcode we’re looking for is RET (0xC3): we copied the byte sequences out of IDA and hacked together an evaluation in Python.

```
arr = [0x50,0x5E,0x5E,0xA3,0x4F,0x5B,0x51,0x5E,0x5E,0x97,0xA3,0x80,0x90,0xA3,0x80,0x90,0xA3,0x80,0x90,0xA3,0x80,0x90,0xA3,0x80,0x90,0xA3,0x80,0x90,0xA3,0x80,0x90,0xA2,0xA3,0x6B,0x7F]"".join([chr(0xC3 - c) for c in arr])
```

Using the current input we can retrieve the flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image60.png)

**Flag:** i*w0uld_l1k3_to_RETurn_this*[joke@flare-on.com](mailto:joke@flare-on.com)

## Challenge 5 - “T8”

> FLARE FACT #823: Studies show that C++ Reversers have fewer friends on average than normal people do. That's why you're here, reversing this, instead of with them, because they don't exist. We’ve found an unknown executable on one of our hosts. The file has been there for a while, but our networking logs only show suspicious traffic on one day. Can you tell us what happened?

### Solution

For this challenge, we’ve been provided with a PCAP in addition to a binary.

#### PCAP file overview

The PCAP contains the communication between the binary and a C2 server (not provided). Having studied thousands of PCAPs, we note an exchange between the binary and C2 server that resembles base64.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image99.jpg)

#### Binary overview

This binary appears to be written in C++ or implement classes in a similar way.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image53.jpg)

If this binary is written in C++, our goal is to find the VTABLE and reconstruct it. The VTABLE in question is located in .rdata at the address 0x0100B918, which means we can stop speculating about this being C++.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image49.jpg)

Renaming the VTABLE functions makes analysis easier and more efficient. We stepped through execution, and a few operations stood out. Following the flow of execution, a pseudorandom string was generated by the function located at 0x0FC1020, using the srand and rand APIs to randomly generate 5 digits. After appending those to the substring FO9, the entire string is MD5-hashed.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image34.jpg)

The string “ahoy” is RC4-encrypted using the MD5 hash as a key, and then the result is base64-encoded and sent to the server using an HTTP POST request. Data sent back from C2 is base64-decoded and then decrypted using the same MD5 hash. To proceed with the challenge, we’ll need to apply our understanding of this configuration.

Our next objective is to bruteforce the random string to derive the RC4 key. To do that, we wrote a script to generate a word list of all the possible values for that string of eight characters which will resemble “FO9\<5DIGITS\>”. We also know that the string “ahoy” is encrypted and encoded by this process, which means we can look for that string in the PCAP by searching for “ydN8BXq16RE=”.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image77.jpg)

Our script tells us the random string (F0911950) and hash (a5c6993299429aa7b900211d4a279848), so we can emulate the C2 server and replay the PCAP to decrypt the data. But, as seen in the screenshot below, just putting a breakpoint after the decrypt_server_data function we can find the flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image17.jpg)

**Flag:** i*s33*[you_m00n@flare-on.com](mailto:you_m00n@flare-on.com)

## Challenge 6 - “à la mode”

> FLARE FACT #824: Disregard flare fact #823 if you are a .NET Reverser too. We will now reward your fantastic effort with a small binary challenge. You've earned it kid!

### Solution

This challenge starts off in a hauntingly familiar way: with an incident response chat log and a .NET DLL.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image74.jpg)

The chat log offers a clue that another (missing) component may interact with the DLL.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image46.jpg)

Working with .NET samples often, you’ll be familiar with dnSpy. Right away we spotted a function of the DLL labeled GetFlag and containing client-side code for connecting to a NamedPipe called FlareOn.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image38.jpg)

Given the previous clue, we know there is something more to this DLL. We opened it in IDA and noted some interesting strings, which appear superficially similar.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image91.jpg)

Cross-referencing these strings led us to a simple encryption function used throughout the program with a single-byte XOR (0x17). In this function the library imports are consistent with NamedPipe functionality.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image92.jpg)

After annotating the libraries and reviewing this functionality, it establishes a named pipe and performs validation.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image96.jpg)

This validation function uses a new string encryption function and string comparison (lstrcmpA) when the connection occurs.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image90.jpg)

With this information, we used x64dbg to set this validation function as the origin function and retrieved the decrypted flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image45.jpg)

**Flag:** M1x3d*M0dE*[4_l1f3@flare-on.com](mailto:4_l1f3@flare-on.com)

## Challenge 7 - “anode”

> You've made it so far! I can't believe it! And so many people are ahead of you!

### Solution

This challenge is a 55 MB Windows PE file which appears to be a packed Node.js binary. When the binary is executed it asks for a flag and returns a “Try Again” error message.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image40.jpg

Conveniently (but not helpfully), we see it when we search strings.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image70.jpg)

We can better locate it using the HxD hex editor, which reveals it in a larger blob of cleartext code.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image1.jpg)

This blob of code also tells us that the flag is expected to have a length of 44 characters. Sometimes the wrong answer tells you enough to get the right one, though. The attempt generated a new error, though. Readers should note that this attempt was coincidentally made using an unpacked version.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image25.jpg)

That error message appears in the cleartext blog of code we discovered, which helps us locate the responsible logic and get one step closer to the right flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image16.jpg)

Curiously, when submitting the same bad flag using the packed binary, the error is different.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image40.jpg

If we comment the condition out to bypass that validation, we get another new error.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image41.jpg)

Something is definitely happening, and while experimenting has revealed a few things we should finish reviewing this cleartext blob of code to understand how the challenge works. It appears as though the flag is submitted and transformed within a state machine that we need to figure out.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image36.jpg)

And the result of that state machine operation is evaluated against the correct flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image14.jpg)

But now we have a different (bigger) problem, because it looks like each value is XOR-encrypted with a randomly-generated value supplied by the math.random function. Also we don’t know the sequence of values that produce the expected sequence of operations. But this is functional in the challenge binary, which means there’s a fixed sequence of randoms.

We need to dump those values, and we can do this by patching the script being used by the challenge binary and writing that sequence of values to a file.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image35.jpg)

We also dump the sequence of states using the same method.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image93.jpg)

Now we can patch the binary to output both sequences of values and states, which makes debugging so much easier.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image21.jpg)

We have the elements we need to reverse operations and their order, but we’re feeling lazy so let’s build ourselves a javascript deobfuscator! This will help get rid of that state machine and reverse the encryption to reveal the flag, we’re using the [pyesprima](https://github.com/int3/pyesprima) frontend for Javascript. First, we’ll create a class that inherits the esprima.NodeVisitor class and will be able to visit the JavaScript Abstract Syntax Tree (AST).

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image18.jpg)

Next, we then visit the AST and collect each subtree associated to a switch case node.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image61.jpg)

For each state that was previously extracted, we test the if/else node’s condition and choose the right branch’s inner subtree. Either the predicate is a literal and we directly test its value or the predicate is a Math.random call so we test the next value.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image19.jpg)

Finally, for each expression we determine if it contains a Math.floor(Math.random) call and then replace it with the right random value, then for the current state replace the original subtree with our expression.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image69.jpg)

Pyesprima doesn’t return JavaScript code back from its AST. So we implemented a very small JavaScript code emitter that replaces each node with the proper JavaScript code recursively.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image22.jpg)

But after comparing the deobfuscated script and the packed binary, we still don’t have the same result!

There must be some shenanigans in addition to math.random. We quickly discover by testing that the if(x) and the if(xn), with x being a number, have two strange different behaviors. if(x) always returns false if the number is \> 0 and if(xn) always returns false if the number contains a zero!

So with this in mind, we fixed the predicates in the script before running the deobfuscator again.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image80.jpg)

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image100.jpg)

This looks like our obfuscated script.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image63.jpg)

Let’s reverse this obfuscation.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image37.jpg)

The final inverted script with “target” as the initial flag looks like this:

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image54.jpg)

_Readers interested in the scripts created for FLARE-ON challenges can find them linked at the end of this publication._

Running the script ends up producing an array.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image47.jpg)

**Flag:** n0t*ju5t_A_j4vaSCriP7*[ch4l1eng3@flare-on.com](mailto:ch4l1eng3@flare-on.com)

## Challenge 8 - “Backdoor”

> I'm such a backdoor, decompile me why don't you…

### Solution

This challenge consists of an 11MB Windows PE binary that executes when launched, but returns nothing to the console. We often augment analysis with packet captures, and were listening with WireShark when we observed a DNS resolution event. We’re off to a great start.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image76.jpg)

We notice a convention that may be significant: we have flare_xx functions and their flared_yy counterparts. If we inspect the flare_xx functions, they each contain a “try/catch” structure.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image31.jpg

But when we turned to look at their flared_yy counterparts, something's not quite right.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image33.jpg)

In dnSpy, we trace execution to an InvalidProgramException and don’t reach the flared_yy code. But in spite of that, the challenge seems to execute somewhat successfully.

Beginning with main and analyzing the first function, we have a rough outline of what’s happening: there are two layers of “try/catch” logic doing similar things in different ways, and creating a dynamic method Intermediate Language (IL) somehow provided by parameters.

The first layer, flare_71, constructs a dynamic method with the IL directly passed as parameter:

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image31.jpg

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image95.jpg)

Some behind-the-scenes work happens to patch the IL code using a metadata token that has the dynamic method’s context before SetCode is called. A dictionary of locations and metadata tokens is resolved by calling GetTokenFor in the same context, as well.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image43.jpg)

After patching, the IL is only valid in the context of the dynamic method. To reconstruct the binary properly, now we need to dump the IL before it can be modified, patch it with the right metadatatoken, and then patch the binary to fix the broken function.

We can create a script to do that in Python.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image52.jpg)

After patching the binary’s first layer, it decompiles correctly. The flared_70 function, responsible for running the second obfuscation layer, is a bit more complicated though.

The function will read one of its PE sections by name, using the first 8 characters of the hash of the metadata token and corresponding to the function that raised the InvalidProgramException error. This is decrypted with a hardcoded key. The decrypted section contains the IL of the function to call.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image81.jpg)

The IL patching is somewhat complicated this time and involves a little obfuscation.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image39.jpg)

The next problem is that we don’t have all the hashes beforehand, only when the function gets called. If we put a breakpoint on the resolving function, we can dump each hash.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image94.jpg)

We wrote a script to do the patching automatically and run it each time we add a new hash.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image84.jpg)

At this point most of the functions are deobfuscated and we can move on to the core of the challenge.

Initially we observed a large number of DNS resolution events, but didn’t see the malware attempt a network connection to our Flask server. While debugging the sample, though, we can see what looks like an attempt to process commands.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image50.jpg)

The problem is that we still don’t know how to interact with the backdoor. By backtracking to the source of each command, we can see that this sample is using the IP addresses received from these DNS resolutions for communication. Now we know why we didn’t see this sample try to connect to our Flask server, at least.

How this worked, we were about to learn, is a little complicated.

The first IP address is used to create a file, after which all commands arrive in the form of a “255.x.y.z” network address. Each IP address returned to the sample is parsed for its octets, but it might be easier to understand with a concrete example:

When a DNS resolution returns 255.0.0.2, the backdoor expects two specific bytes of data (43d and 50d) which are used to calculate what superficially resembles a network address, 43.50.0.0. The command processing function then performs a comparison and appends a value between 0 and 22.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image59.jpg)

The flared_56 function XORs a value in an array with 248 to determine if the result is equal to the value passed in the parameter or not. If so, it appends a small chunk of text to one of the object’s properties and that value is then removed from the array.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image7.jpg)

This tells us which command to send and in which order to append all the text chunks. We also noticed that when the array value is empty the \_bool flag is set to false. That’s probably not an accident, so let’s inspect any functions using that flag.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image79.jpg)

This function is triggered each time an element is deleted from the value array.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image48.jpg)

We can expect something to happen once the right conditions are met, and endeavor to contrive them.

First, we generated a list of all possible IP address values. Then we configured [FakeDns](https://github.com/Crypt0s/FakeDns) to resolve \*.flare-on.com to that value list.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image44.jpg)

Next, we use FakeDns to respond to requests using a round-robin approach that resolves to each IP address in order, until finally we get the response we were waiting for.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image62.jpg)

\*_Flag: \*\_W3_4re_Known_f0r_[b31ng_Dyn4m1c@flare-on.com](mailto:b31ng_Dyn4m1c@flare-on.com)

## Challenge 9 - “encryptor”

> You're really crushing it to get this far. This is probably the end for you. Better luck next year!

### Solution

For this challenge, we’re provided two files: a Windows PE executable and an encrypted file.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image66.jpg)

Encryption is interesting, and when we opened it in HxD we immediately saw a bunch of garbage followed by hexified data.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image83.jpg)

When the binary is executed, it helpfully indicates a path is expected as an argument.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image29.jpg)

But nothing happens when a random file is chosen, so a less random file must be what we need.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image42.jpg)

We begin by tracing the function in IDA and note that it’s looking for a specific extension, “.EncryptMe”.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image3.jpg)

Let’s try again with a random file that uses that specific file extension.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image6.jpg)

And we see a new file generated with a different extension (“.Encrypted”) and a larger file size.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image56.jpg)

Looking more closely at the executable in IDA, we determine that the binary is using ChaCha20 with a random key encrypted using RSA-2048.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image5.jpg)

_We need that key._

On the most basic level, encryption is just a system of math made up of basic operations like addition and multiplication. RSA is considered a strong implementation because it uses big numbers, and most RSA libraries implement a big number library of some kind. But we don’t really want to reverse all that just for the key, especially when we can find all the related functions in the sample and apply our knowledge of RSA.

We need to generate prime numbers for two variables, p and q.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image11.jpg)

We need to generate the modulus value n, which is equal to p\*q. Using p and q as inputs, return n. So far, so good.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image57.jpg)

And we’re going to need a value phi, which is equal to (p-1)\*(q-1).

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image67.jpg)

We deduce that the 2 previous functions are the decrement function that produce p-1 and q-1.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image89.jpg)

Finally, we have an operation that produces the secret key d using phi and the exponent e.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image86.jpg)

Notice however that something fishy is already happening because the global variable containing the exponent e is reused and will contain the private key d. Now at least we can validate that the key is encrypted with the private key (d, n) instead of the public key (e, n).

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image15.jpg)

We can use the public key to decrypt the ChaCha20 key, however we don’t know the modulus value or the encrypted key. Fortunately for us, they are both hexified and appended to the encrypted output file.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image26.jpg)

The encrypted ChaCha20 key is actually contained in the last three rows of the init structure, along with the nonce.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image32.jpg)

The key can be decrypted with a little python.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image51.jpg)

And we’re one step closer.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image101.jpg)

By tracing execution with x64dbg, we can force the decryption of the encrypted file by replacing the ChaCha20 parameters with the key and nonce we’ve just obtained. Another flag down, and one more to go!

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image28.jpg)

\*_Flag: \*\_R$A_$16n1n6*15_0pp0$17e*[0f_3ncryp710n@flare-on.com](mailto:0f_3ncryp710n@flare-on.com)

## Challenge 10 - The Karaoke Labyrinth

Somehow every member of the team has a nearly encyclopedic knowledge of song lyrics, and intuited their way through this one. Surprisingly whimsical, no reversing necessary.

## Challenge 11 - “The challenge that shall not be named”

> Protection, Obfuscation, Restrictions... Oh my!! The good part about this one is that if you fail to solve it I don't need to ship you a prize.

### Solution

This was the eleventh and final challenge of FLARE-ON 9, and unexpectedly straightforward after some of the previous ones. This challenge consisted of a binary, running strings on it gave some hints about it.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image65.jpg)

“PyInstaller bundles a Python application and all its dependencies into a single package” is a nice summary of what PyInstaller is used for. This binary is compiled from Python scripts and packaged as a single executable, which is less of a problem than it might seem. We encounter those often enough that we’ve found [tools](https://github.com/extremecoders-re/pyinstxtractor) to extract python compiled in this way, and we pulled out a few python files.

One of the files, 11.py, threw errors when we attempted to step through it and complained that the library “‘crypt’ has no attribute ‘ARC4’”.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image24.jpg)

That’s kind of interesting. Notably, we can modify the crypt.py script located in “PYTHON_FOLDER_PATH\lib\crypt.py”, adding the ARC4 function and the class it returns with our custom encrypt function.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image10.jpg)

When we run 11.py again, this time it prints us a beautiful flag which wakes us from the dream (or nightmare) that is the FLARE-ON challenge.

![](/assets/images/flare-on-9-solutions-burning-down-the-house/image58.jpg)

\*_Flag: \*\_Pyth0n_Prot3ction_tuRn3d_Up_[t0_11@flare-on.com](mailto:t0_11@flare-on.com)

## Conclusion

For the 2022 FLARE-ON challenge, that’s a wrap! We learned a bunch of new things this year and we hope you enjoyed reading our solutions. We’re looking forward to reading yours and learning things we didn’t try.

For those who have waited patiently for a link to scripts, [here you go](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt2d75d12507c1a14d/636e8b687c54010b136bf9ec/flare-on_9_scripts.zip).

#### Acknowledgements

We want to thank Elastic and Devon Kerr, who gave us the opportunity to spend a week focused on this event. Thanks also to the Mandiant team for the fun and thoughtful challenges: well done. To the researchers who participated, thank you for making it a phenomenal week of learning.
