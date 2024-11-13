---
title: "BPFDoor Configuration Extractor"
slug: "bpfdoor-configuration-extractor"
date: "2022-12-06"
description: "Configuration extractor to dump out hardcoded passwords with BPFDoor."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - bpfdoor
---

Configuration extractor to dump out hardcoded passwords with BPFDoor.

[Download bpfdoor-config-extractor.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt3f57100ade3473c5/62882ccdb4fa6b61ed70ba87/bpfdoor-config-extractor.tar.gz)

## Overview

This tool provides a Python module and command line tool that will extract passwords from BPFDoor samples.

> The Elastic Security Team has released an indepth analysis of the BPFDoor malware and created an additional tool that will scan for BPFDoor infected hosts.
>
> - [BPFDoor analysis](https://bookish-bassoon-c37be003.pages.github.io/intelligence/2022/05/04.bpfdoor/article/)
> - [BPFDoor scanner](https://www.elastic.co/security-labs/bpfdoor-scanner)

## Getting Started

### Docker

We can easily run the extractor with Docker, first we need to build the image.

```
Building the BPFDoor Docker image

docker build . -t bpfdoor-extractor
```

Then we run the container with the **-v** flag to map a host directory to the Docker container directory that contains the BPFDoor samples.

```
Running the BPFDoor Docker container

docker run -ti --rm -v $(pwd)/binaries:/binaries \
  bpfdoor-extractor:latest -d /binaries/
```

We can either specify a single sample with **-f** option or a directory of samples with **-d**

```
BPFDoor Configuration Extractor help output

docker run -ti --rm bpfdoor-extractor:latest -h

Author: Elastic Security (MARE)

______ ______ ______ ______
| ___ \| ___ \|  ___||  _  \
| |_/ /| |_/ /| |_   | | | | ___    ___   _ __
| ___ \|  __/ |  _|  | | | |/ _ \  / _ \ | '__|
| |_/ /| |    | |    | |/ /| (_) || (_) || |
\____/ \_|    \_|    |___/  \___/  \___/ |_|
 _____                 __  _          _____       _                      _
/  __ \               / _|(_)        |  ___|     | |                    | |
| /  \/  ___   _ __  | |_  _   __ _  | |__ __  __| |_  _ __  __ _   ___ | |_  ___   _ __
| |     / _ \ | '_ \ |  _|| | / _` | |  __|\ \/ /| __|| '__|/ _` | / __|| __|/ _ \ | '__|
| \__/\| (_) || | | || |  | || (_| | | |___ >  < | |_ | |  | (_| || (__ | |_| (_) || |
 \____/ \___/ |_| |_||_|  |_| \__, | \____//_/\_\ \__||_|   \__,_| \___| \__|\___/ |_|
                               __/ |
                              |___/


usage: bpfdoor-extractor [-h] (-f FILENAME | -d DIRNAME)

options:
  -h, --help            show this help message and exit
  -f FILENAME, --file FILENAME
                        File
  -d DIRNAME, --dir DIRNAME
                        Directory

```

### Running it Locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
poetry lock
poetry install
poetry shell
bpfdoor-extractor --help
```

Once that works, you can do the same sort of things as mentioned in the Docker instructions above.
