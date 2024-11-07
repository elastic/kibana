---
title: "BLISTER Configuration Extractor"
slug: "blister-configuration-extractor"
date: "2022-12-06"
description: "Python script to extract the configuration and payload from BLISTER samples."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - blister
  - ref7890
---

Python script to extract the configuration and payload from BLISTER samples.

[Download blister-config-extractor.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt9bce8a0e1a513bd5/62882db13b9b8554904a4baa/blister-config-extractor.tar.gz)

## Getting Started

This tool provides a Python module and command line tool that will extract configurations from the BLISTER malware loader and dump the results to screen.

> For information on the BLISTER malware loader and campaign observations, check out our blog posts detailing this:
>
> - [BLISTER Campaign Analysis](https://www.elastic.co/security-labs/elastic-security-uncovers-blister-malware-campaign)
> - [BLISTER Malware Analysis](https://www.elastic.co/security-labs/blister-loader)

### Docker

We can easily run the extractor with Docker, first we need to build the image:

```
docker build . -t blister-config-extractor
```

Then we run the container with the **-v** flag to map a host directory to the docker container directory:

```
docker run -ti --rm -v \
"$(pwd)/binaries":/binaries blister-config-extractor:latest -d /binaries/

```

We can either specify a single sample with **-f** option or a directory of samples with **-d**.

![BLISTER configuration extrator output](/assets/images/blister-configuration-extractor/blister-configuration-extractor-image41.jpg)

### Running it Locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
poetry lock
poetry install
poetry shell
blister-config-extractor -h

```

Once that works, you can do the same sort of things as mentioned in the Docker instructions above.

## References

- Customised Rabbit cipher implementation based on [Rabbit-Cipher](https://github.com/Robin-Pwner/Rabbit-Cipher/)
