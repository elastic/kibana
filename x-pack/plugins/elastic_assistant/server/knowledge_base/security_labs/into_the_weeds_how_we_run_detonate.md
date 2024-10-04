---
title: "Into The Weeds: How We Run Detonate"
slug: "into-the-weeds-how-we-run-detonate"
date: "2023-06-13"
subtitle: "A deeper dive into the technical implementations of Detonate"
description: "Explore the technical implementation of the Detonate system, including sandbox creation, the supporting technology, telemetry collection, and how to blow stuff up."
author:
  - slug: jessica-david
  - slug: sergey-polzunov
  - slug: hez-carty
image: "photo-edited-02@2x.jpg"
category:
  - slug: detection-science
  - slug: tools
  - slug: security-research
tags:
  - detonate
---

## Preamble

In our [first post](https://www.elastic.co/security-labs/click-click-boom-automating-protections-testing-with-detonate) in our Detonate series, we introduced the Detonate system and what we use it for at Elastic. We also discussed the benefits it provides our team when assessing the performance of our security artifacts.

In this publication, we will break down how Detonate works & dive deeper into the technical implementation. This includes how we’re able to create this sandboxed environment in practice, the technology that supports the overall pipeline, and how we submit information to and read information from the pipeline.

> Interested in other posts on Detonate? Check out [Part 1 - Click, Click…Boom!](https://www.elastic.co/security-labs/click-click-boom-automating-protections-testing-with-detonate) where we introduce Detonate, why we built it, explore how Detonate works, describe case studies, and discuss efficacy testing.

## Architecture

Below is a high-level overview of the Detonate end-to-end architecture.

![The end-to-end Detonate architecture, including how we send input to the API server, each individual worker & associated queue, cloud infrastructure details, and our Elastic data stores.](/assets/images/into-the-weeds-how-we-run-detonate/image8.png)

The overall system consists of a series of message queues and Python workers. Detonation tasks are created by an API server upon accepting a request with as little information as the sample file hash. The task then moves from queue to queue, picked up by workers that execute various operations along the way.  
The server and workers run in a container on [Amazon ECS](https://aws.amazon.com/ecs/). The pipeline can also be brought up locally using [Docker Compose](https://docs.docker.com/compose/) for early development and feature testing.

### API server

The Detonate API server is a [FastAPI](https://fastapi.tiangolo.com/) python application that accepts a variety of execution target requests: hashes of samples, native commands (in bash or Powershell, with or without arguments), and uploaded files. The server also exposes endpoints for fetching alerts and raw agent telemetry from an Elastic cluster.

The API documentation is generated [automatically](https://fastapi.tiangolo.com/advanced/extending-openapi/) by FastAPI and incorporated into our global API schema.

![The schema includes varies get methods to see information about the running task.](/assets/images/into-the-weeds-how-we-run-detonate/image2.png)

#### Interacting with the API server - CLI

We built a custom Python CLI (command-line interface) tool for interacting with our Detonate server. The CLI tool is built using the Python library [click](https://click.palletsprojects.com/en/8.1.x/) along with [rich](https://github.com/Textualize/rich) for a beautiful formatting experience in a terminal window. The tool is particularly useful for debugging the pipeline, as it can also be run against a local pipeline setup. The tool is installed and runs using [Poetry](https://python-poetry.org/), our preferred tool of choice for managing dependencies and running scripts.

```
❯ DETONATE_CLI_API_ROOT_URL="${API_ENDPOINT_URL}" \
	DETONATE_CLI_API_AUTH_HEADER="${API_KEY}" \
	poetry run cli \
	--hash "${MY_FILE_HASH}"
```

![An example of the output from the CLI tool once a hash is submitted. It shows the hash, the task ID, and where along the pipeline the process is as well as the last worker status.](/assets/images/into-the-weeds-how-we-run-detonate/image5.png)

![The full output of a Hash detonation in the console. The links include references to run logs, task information, events and alerts in our Elastic clusters, and more.](/assets/images/into-the-weeds-how-we-run-detonate/image13.png)

#### Interacting with the API server - Web UI

Internally, we host a site called Protections Portal (written using [Elastic UI](https://elastic.github.io/eui/) components) to assist our team with research. For a more interactive experience with the Detonate API, we built a page in the Portal to interact with it. Along with submitting tasks, the Web UI allows users to see the feed of all detonations and the details of each task.

![The Detonate landing page Protections Portal showing the input field for starting a detonation. Below the input is a task that is currently running.](/assets/images/into-the-weeds-how-we-run-detonate/image10.png)

Each task can be expanded to see its full details. We provide the links to the data and telemetry collected during the detonation.

![The UI shows the completed detonation task in the Protections Portal.](/assets/images/into-the-weeds-how-we-run-detonate/image11.png)

#### Interacting with the API server - HTTP client

If our users want to customize how they interact with the Detonate API, they can also run commands using their HTTP client of choice (such as **curl** , **httpie** , etc.). This allows them to add detonations to scripts or as final steps at the end of their own workflows.

### Queues

The pipeline is built on a series of queues and workers. Having very basic requirements for the message queues engine, we decided to go with [Amazon SQS](https://aws.amazon.com/sqs/). One of the many benefits of using a popular service like SQS is the availability of open-source resources and libraries we can build upon. For example, we use [softwaremill/elasticmq](https://github.com/softwaremill/elasticmq) Docker images as a queue engine when running the pipeline locally.

The queues are configured and deployed with Terraform code that covers all our production and staging infrastructure.

### Workers

Each worker is a Python script that acts as both a queue consumer and a queue producer. The workers are implemented in our custom mini-framework, with the boilerplate code for error handling, retries, and monitoring built-in. Our base worker is easily extended, allowing us to add new workers and evolve existing ones if additional requirements arise.

For monitoring, we use the [Elastic APM](https://www.elastic.co/observability/application-performance-monitoring) observability solution. It is incredibly powerful, giving us a view into the execution flow and making debugging pipeline issues a breeze. Below, we can see a Detonate task move between workers in the APM UI:

![The Elastic Observability APM tracing page showing the execution flow of a detonation task. We are able to follow the task between each worker & queue to see where we may have issues or can add improvements.](/assets/images/into-the-weeds-how-we-run-detonate/image12.png)

These software and infrastructure components give us everything we need to perform the submission, execution, and data collection that make up a detonation.

## Detonations

![Caption: by Simon Lee, https://unsplash.com/photos/CKuOXoZ21a8](/assets/images/into-the-weeds-how-we-run-detonate/image3.jpg)

The pipeline can execute commands and samples in Windows, Linux, and macOS virtual machines (VMs). For Windows and Linux environments, we use VM instances in [Google Compute Engine](https://cloud.google.com/compute). With the wide selection of public images, it allows us to provision sandboxed environments with different versions of Windows, Debian, Ubuntu, CentOS, and RHEL.

For macOS environments, we use [mac1.metal instances in AWS](https://aws.amazon.com/ec2/instance-types/mac/) and an on-demand macOS VM provisioning [solution from Veertu called Anka](https://veertu.com/anka-build/). Anka gives us the ability to quickly rotate multiple macOS VMs running on the same macOS bare metal instance.

Detonate is currently focused on the breadth of our OS coverage, scalability, and the collection of contextually relevant data from the pipeline. Fitting sophisticated anti-analysis countermeasures into Detonate is currently being researched and engineered.

### VM provisioning

In order to keep our footprint in the VM to a minimum, we use startup scripts for provisioning. Minimizing our footprint is important because our activities within a VM are included in the events we collect, making analysis more complicated after a run. For Windows and Linux VMs, [GCP startup scripts](https://cloud.google.com/compute/docs/instances/startup-scripts) written in Powershell and bash are used to configure the system; for macOS VMs, we wrote custom bash and AppleScript scripts.

The startup scripts perform these steps:

- **Configure the system**. For example, disable MS Defender, enable macros execution in MS Office, disable automatic system updates, etc.
- **Download and install Elastic agent**. The script verifies that the agent is properly [enrolled into the Fleet Server](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) and that the policies are applied.
- **Download and detonate a sample, or execute a set of commands**. The execution happens in a background process, while the main script collects the STDOUT / STDERR datastreams and sleeps for N seconds.
- **Collect files from the filesystem (if needed) and upload them into the storage**. This allows us to do any additional verification or debugging once the detonation is complete.

The VM lifecycle is managed by the **start_vm** and **stop_vm** workers. Since we expect some detonations to break the startup script execution flow (e.g., in the case of ransomware), every VM has a TTL set, which allows the **stop_vm** worker to delete VMs not in use anymore.

This clean-slate approach, with the startup script used to configure everything needed for a detonation, allows us to use VM images from the vendors from Google Cloud public images catalog without any modifications!

### Network configuration

Some of the samples we detonate are malicious and might produce malicious traffic, such as network scans, C2 callouts, etc. In order to keep our cloud resources and our vendor’s infrastructure safe, we limit all outgoing traffic from VMs. The instances are placed in a locked-down VPC that allows outgoing connection only to a predefined list of targets. We restrict traffic flows in VPC using Google Cloud’s [routes](https://cloud.google.com/vpc/docs/routes) and [firewall rules](https://cloud.google.com/firewall/docs/firewalls), and AWS’s [security groups](https://docs.aws.amazon.com/vpc/latest/userguide/security-groups.html).

We also make use of [VPC Flow Logs](https://cloud.google.com/vpc/docs/flow-logs) in GCE. These logs allow us to see private network traffic initiated by sandbox VMs in our VPC.

### Telemetry collection

To observe detonations, we use the [Elastic Agent](https://www.elastic.co/elastic-agent) with the [Elastic Defend](https://www.elastic.co/guide/en/security/current/install-endpoint.html) integration installed with all protections in “Detect” (instead of “Protect”) mode. This allows us to collect as much information from a VM as we can, while simultaneously allowing the [Elastic Security](https://www.elastic.co/security) solution to produce alerts and detections.

![The policy settings in Elastic Defend integration for Detonate.](/assets/images/into-the-weeds-how-we-run-detonate/image6.png)

We cover two use cases with this architecture: we can validate protections (comparing events and alerts produced for different OS versions, agent versions, security artifacts deployed, etc) and collect telemetry for analysis (for fresh samples or novel malware) at the same time. All data collected is kept in a persistent Elastic cluster and is available for our researchers.

## Running in production

Recently we completed a full month of running Detonate pipeline in production, under the load of multiple data integrations, serving internal users through UI at the same time. Our record so far is 1034 detonations in a single day, and so far, we haven’t seen any scalability or reliability issues.

![Data from our internal Detonate telemetry, visualized in Kibana.](/assets/images/into-the-weeds-how-we-run-detonate/image4.png)

The bulk of the submissions are Windows-specific samples, for now. We are working on increasing our coverage of Linux and macOS as well – stay tuned for the research blog posts coming soon!

![Additional visualization types can help us further break down how Detonate is being used.](/assets/images/into-the-weeds-how-we-run-detonate/image7.png)

We are constantly improving our support for various file types, making sure the detonation is as close to the intended trigger behavior as possible.

Looking at the detonations from the last month, we see that most of the tasks were completed in under 13 minutes (with a median of 515 seconds). This time includes task data preparation, VM provisioning and cleanup, sample execution, and post-detonation processing.

![Data from our internal Detonate telemetry, generated using custom Python code.](/assets/images/into-the-weeds-how-we-run-detonate/image14.jpg)

These are still early days of the service, so it is normal to see the outliers. Since most of the time in a task is spent waiting for a VM to provision, we can improve the overall execution time by using custom VM images, pre-starting VM instances, and optimizing the startup scripts.

## What's next?

Now that you see how Detonate works, our next posts will dive into more detailed use cases of Detonate. We’ll go further into how these detonations turn into protecting more of our users, including right here at Elastic!
