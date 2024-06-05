---
title: "EMOTET Configuration Extractor"
slug: "emotet-configuration-extractor"
date: "2022-12-06"
subtitle: "Configuration extraction tool for the EMOTET malware."
description: "Python script to extract the configuration from EMOTET samples."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - emotet
---

Python script to extract the payload from EMOTET samples.

[Download emotet-configuration-extractor.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blte2addf7080c31792/635ad4a5a739cc5f6cbd595e/emotet-configuration-extractor.tar.gz)

> For information on the EMOTET malware check out the following resources:
>
> - [EMOTET Dynamic Configuration Extraction](https://www.elastic.co/security-labs/emotet-dynamic-configuration-extraction)

## Getting started

### Docker

The recommended and easiest way to get going is to use Docker. From the directory this README is in, you can build a local container.

```
docker build . -t emotet-config-extractor
```

Then we run the container with the **-v** flag to map a host directory to the docker container directory.

```
docker run -ti --rm -v $(pwd)/data:/data emotet-config-extractor:latest --help
```

### Running it locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
poetry lock
poetry install
poetry shell
emotet-config-extractor --help
```

## Usage

All samples need to be unpacked prior to execution extraction attempts.

Our extractor takes either a directory of samples with **-d** option or **-f** for a single sample and then can output parts of the configuration of note, specifically:

- **-k** : extract the encryption keys
- **-c** : extract the C2 information
- **-s** : extract the wide-character strings
- **-a** : extract the ASCII character strings

```
docker run -ti --rm -v $(pwd)/data:/data emotet-config-extractor:latest -d "C:\tmp\samples"
```

![EMOTET configuration extractor](/assets/images/emotet-configuration-extractor/image.jpg)

You can collect the extracted configurations from the directory you set when running the extractor.
