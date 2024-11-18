---
title: "Detect domain generation algorithm (DGA) activity with new Kibana integration"
slug: "detect-domain-generation-algorithm-activity-with-new-kibana-integration"
date: "2023-05-17"
description: "We have added a DGA detection package to the Integrations app in Kibana. In a single click, you can install and start using the DGA model and associated assets, including ingest pipeline configurations, anomaly detection jobs, and detection rules."
author:
  - slug: melissa-alvarez
image: "library-branding-elastic-stack-midnight-1680x980-no-logo.jpg"
category:
  - slug: machine-learning
  - slug: detection-science
---

Searching for a way to help protect your network from potential domain generation algorithm (DGA) attacks? Look no further — a DGA detection package is now available in the Integrations app in Kibana.

In a single click, users can install and start using the DGA model and associated assets, including ingest pipeline configurations, anomaly detection jobs, and detection rules. Read on for step-by-step instructions on installing and fully enabling the DGA package.

[Related article: [Automating the Security Protections rapid response to malware](https://www.elastic.co/blog/automating-security-protections-rapid-response-to-malware)]

# What is a DGA?

A DGA is a technique employed by many malware authors to ensure that infection of a client machine evades defensive measures. The goal of this technique is to hide the communication between an infected client machine and the command and control (C & C or C2) server by using hundreds or thousands of randomly generated domain names, of which one will ultimately resolve to the IP address of a C & C server.

To more easily visualize what’s occurring in a DGA attack, imagine for a moment you’re a soldier on a battlefield. Like many soldiers, you have communication gear that uses radio frequencies for communication. Your enemy may try to disrupt your communications by jamming your radio frequencies. One way to devise a countermeasure for this is by frequency hopping — using a radio system that changes frequencies very quickly during the course of a transmission. To the enemy, the frequency changes appear to be random and unpredictable, so they are hard to jam.

DGAs are like a frequency-hopping communication channel for malware. They change domains so frequently that blocking the malware’s C2 communication channel becomes infeasible by means of DNS domain name blocking. There are simply too many randomly generated DNS names to successfully identify and block them.

This technique emerged in the world of malware with force in 2009, when the “Conficker” worm began using a very large number of randomly generated domain names for communication. The worm’s authors developed this countermeasure after a consortium of security researchers interrupted the worm’s C2 channel by shutting down the DNS domains it was using for communication. DNS mitigation was also performed in the case of the 2017 WannaCry ransomware global outbreak.

# Getting started

We have released the model and the associated assets — including the pipelines, anomaly detection configurations, and detection rules — to the Integrations app in Kibana as of 8.0. We will be maintaining this format moving forward.

If you don’t have an Elastic Cloud cluster but would like to start experimenting with the released ProblemChild package, you can start a [free 14-day trial](https://cloud.elastic.co/registration) of Elastic Cloud.

We will now look at the steps to get DGA up and running in your environment in a matter of minutes using the released DGA package.

### Step 1: Installing the package assets

In Kibana, the Integrations app now includes the DGA detection package. To install the assets, click the **Install DGA assets** button under the **Settings** tab. This will install all of the artifacts necessary to use the DGA model to generate alerts when DGA activity is detected in your network data.

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/blog-elastic-DGA-1.png)

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/blog-elastic-DGA-2.jpg)

Once installation is complete, you can navigate to **Stack Management > Ingest Pipelines** and see that the **`<version-number>-ml\_dga\_ingest\_pipeline`** has been installed and can now be used to enrich incoming ingest data. The ingest pipeline leverages the **`<version-number>-ml\_dga\_inference\_pipeline`** to do this.

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/blog-elastic-DGA-3.png)

Similarly, the installed DGA model can now be seen in **Machine Learning > Model Management > Trained Models**.

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/blog-elastic-DGA-4.jpg)

### Step 2: Enriching your data

Now you are ready to ingest your data using the ingest pipeline. The supervised model will analyze and enrich incoming data containing DNS events with a DGA score.

This pipeline is designed to work with data containing DNS events — such as [packetbeat](https://www.elastic.co/beats/packetbeat) data — which contain these ECS fields: dns.question.name and dns.question.registered_domain. You can add the installed ingest pipeline to an Elastic beat by adding a simple [configuration setting](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html#pipelines-for-beats).

If you already have an ingest pipeline associated with your indices, you can use a [pipeline processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/pipeline-processor.html) to integrate the DGA ingest pipeline into your existing pipeline.

You will also want to add the following mappings to the beat you chose:

```
{
  "properties": {
    "ml_is_dga": {
      "properties": {
        "malicious_prediction": {
          "type": "long"
        },
        "malicious_probability": {
          "type": "float"
        }
      }
    }
  }
}
```

You can do this under **Stack Management > Index Management > Component Templates.** Templates that can be edited to add custom components will be marked with a _@custom_ suffix. Edit the _@custom_ component template for your Elastic beat by pasting the above JSON blob in the **Load JSON** flyout.

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/Screen_Shot_2022-07-29_at_8.37.43_AM.jpeg)

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/Screen_Shot_2022-07-29_at_8.38.11_AM.jpeg)

You should now see that the model enriches incoming DNS events with the following fields:

- **Ml_is_dga.malicious_prediction:** A value of “1” indicates the DNS domain is predicted to be the result of malicious DGA activity. A value of “0” indicates it is predicted to be benign.

- **Ml_is_dga.malicious_probability:** A probability score, between 0 and 1, that the DNS domain is the result of malicious DGA activity.

If you want an immediate way to test that the ingest pipeline is working as expected with your data, you can use a few sample documents with the [simulate pipeline API](https://www.elastic.co/guide/en/elasticsearch/reference/current/simulate-pipeline-api.html) and confirm you see the **ml_is_dga** fields.

### Step 3: Running anomaly detection

The package includes a pre-configured anomaly detection job. This machine learning (ML) job examines the DGA scores produced by the supervised DGA model and looks for anomalous patterns of unusually high scores for a particular source IP address. These events are assigned an anomaly score.

To run this job on your enriched data, go to **Machine Learning > Anomaly Detection**. When you create a job using the job wizard, you should see an option to Use preconfigured jobswith a card for DGA. After selecting the card, you will see the pre-configured anomaly detection job that can be run. Note this job is only useful for indices that have been enriched by the ingest pipeline.

### Step 4: Enabling the rules

To maximize the benefit of the DGA framework, activate the installed detection rules. They are triggered when certain conditions for the supervised model or anomaly detection job are satisfied. The complete list of the installed rules can be found in the **Overview** page of the package itself or in the latest experimental detections [release](https://github.com/elastic/detection-rules/releases/tag/ML-experimental-detections-20211130-7).

To fully leverage the included preconfigured anomaly detection job, enable the complementary rule: _Potential DGA Activity._ This will create an anomaly-based alert in the detection page in the security app.

The preconfigured anomaly detection job and complementary rule are both available in the detection rules repo [releases](https://github.com/elastic/detection-rules/releases). To enable and use the installed rules, navigate to **Security > Rules** and select _Load Elastic prebuild rules and timeline templates_.

![](/assets/images/detect-domain-generation-algorithm-activity-with-new-kibana-integration/blog-elastic-DGA-5.jpg)

# Get in touch

We’d love for you to try out ProblemChild and give us feedback as we work on adding new capabilities to it. If you run into any issues during the process, please reach out to us on our [community Slack channel](https://ela.st/slack), [discussion forums](https://discuss.elastic.co/c/security), or even our [open detections repository](https://github.com/elastic/detection-rules).

You can always experience the latest version of [Elasticsearch Service](https://www.elastic.co/elasticsearch/service) on Elastic Cloud and follow along with this blog to set up the ProblemChild framework in your environment for your Windows process event data. And take advantage of our [Quick Start training](https://www.elastic.co/training/elastic-security-quick-start) to set yourself up for success. Start your [free trial of Elastic Cloud](https://cloud.elastic.co/registration) today to get access to the platform. Happy experimenting!
