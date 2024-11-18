---
title: "BPFDoor Scanner"
slug: "bpfdoor-scanner"
date: "2022-12-06"
description: "Python script to identify hosts infected with the BPFDoor malware."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - bpfdoor
---

Python script to identify hosts infected with the BPFDoor malware.

[Download bpfdoor-scanner.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltae9bafece9048014/62882b50dcc93261eccb04e2/bpfdoor-scanner.tar.gz)

## Getting Started

This tool provides a Python script to identify hosts that are infected with the BPFDoor malware.

> The Elastic Security Team has released an indepth analysis of the BPFDoor malware and created an additional tool that will extract configurations from BPFDoor malware samples.
>
> - [BPFDoor analysis](https://bookish-bassoon-c37be003.pages.github.io/intelligence/2022/05/04.bpfdoor/article/)
> - [BPFDoor configuration extractor](https://www.elastic.co/security-labs/bpfdoor-configuration-extractor)

### Permissions

On Linux (and thus in a container), the tool requires the following permissions:

- CAP_NET_BIND_SERVICE
- CAP_NET_RAW

On any \*NIX host, running the script with sudo will get you what you need. As long as you don’t strip the privileges listed for your container and you publish the UDP port you intend to receive on, you should be set.

### Docker

We can easily run the scanner with Docker, first we need to build the image:

```
Building the BPFDoor scanner Docker image

docker build . -t bpfdoor-scanner
```

## Usage

Once you’be built the Docker iamge, we can run the container to get a list of the options.

```
Runing the BPFDoor container

docker run -ti --rm bpfdoor-scanner:latest --help

Usage: bpfdoor-scanner [OPTIONS]

  Sends a discovery packet to suspected BPFDoor endpoints.

  Example usage:

      sudo ./bpfdoor-scanner --target-ip 1.2.3.4

  Sends a packet to IP 1.2.3.4 using the default target port 68/UDP (tool
  listens on all ports) using the default interface on this host and listens
  on port 53/UDP to masquerade as traffic.

  NOTE: Elevated privileges are required for source ports < 1024.

Options:
  --target-ip TEXT       [required]
  --target-port INTEGER  [default: 68]
  --source-ip TEXT       IP for target to respond to and attempt to bind
                         locally  [default: 172.17.0.3]
  --source-port INTEGER  Local port to listen on for response  [default: 53]
  --timeout INTEGER      Number of seconds to wait for response  [default: 5]
  -v, --verbose          Show verbose output
  -d, --debug            Show debug output
  --version
  --help                 Show this message and exit.
```

The minimum required option is just --target-ip. The rest have defaults. For running in a container, you’ll want to publish the return port (defaults to 53) and specify --source-ip of the host interface you wish to use. In the following example, the IP 192.168.100.10 is the interface on my host that will receive the packet.

```
Example running the BPFDoor scanner

docker run -ti --publish 53:53/udp --rm bpfdoor-scanner:latest \
  --target-ip 192.168.32.18 --source-ip 192.168.100.10
```

## Running Locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
Running BPFDoor scanner locally

poetry lock
poetry install
poetry shell
sudo bpfdoor-scanner --help
```

Once that works, you can do the same sort of things as mentioned in the Docker instructions above.
