---
title: "Detecting Living-off-the-land attacks with new Elastic Integration"
slug: "detecting-living-off-the-land-attacks-with-new-elastic-integration"
date: "2023-03-01"
description: "We added a Living off the land (LotL) detection package to the Integrations app in Kibana. In a single click, you can install and start using the ProblemChild model and associated assets including anomaly detection configurations and detection rules."
author:
  - slug: melissa-alvarez
image: "security-threat-hunting-incidence-response-1200x628.jpg"
category:
  - slug: machine-learning
  - slug: detection-science
---

It is becoming more common that adversary attacks consist of more than a standalone executable or script. Advanced attacker techniques, like “living off the land” (LotL) that appear normal in isolation become more suspicious when observed in a parent-child context. If you are running Windows in your environment, it is important to have a system for detecting these types of attacks. Traditional heuristic-based detections, though effective in detecting a single event, often fail to generalize across a multi-step attack. At Elastic we have trained a Living off the Land classifier, anomaly detection jobs and security detection rules to help our security professionals discover LotL attacks.

With the advent of [Integration packages](https://www.elastic.co/integrations/) in the Elastic stack we can now deliver the full, customizable package that includes the LotL classification model, anomaly detection job configurations, detection rules, and inference pipelines to make it easier to install and get up and running the entire end-to-end data pipeline from collecting windows events to alerting on potential Lotl attacks. We will walk you through how we set it up so you can try it yourself.

# ProblemChild: Recap

In an earlier blog post, we talked about how to use[the detection rules repository command line interface (CLI), to set up the ProblemChild framework and get it up and running in your environment](https://www.elastic.co/blog/problemchild-generate-alerts-to-detect-living-off-the-land-attacks). We have now added a [Living off the land (LotL) detection package](https://docs.elastic.co/integrations/problemchild) to the Integrations app in Kibana. In a single click, you can install and start using the ProblemChild model and associated assets including anomaly detection configurations and detection rules.

As outlined in the [previous blog](https://www.elastic.co/blog/problemchild-generate-alerts-to-detect-living-off-the-land-attacks), ProblemChild is a framework built using the Elastic Stack to detect LotL activity. LotL attacks are generally tricky to detect, given that attackers leverage seemingly benign software already present in the target environment to fly under the radar. The lineage of processes spawned in your environment can provide a strong signal in the event of an ongoing attack.

The supervised machine learning (ML) component of ProblemChild leverages process lineage information present in your Windows process event metadata to classify events as malicious or benign using [Inference](https://www.elastic.co/guide/en/machine-learning/current/ml-dfa-classification.html#ml-inference-class) at the time of ingest. Anomaly detection is then applied to detect rare processes among those detected as malicious by the supervised model. Finally, detection rules alert on rare parent-child process activity as an indication of LotL attacks.

The sheer volume and variety of events seen in organizations poses a challenge for detecting LotL attacks using rules and heuristics, making an ML-based framework such as ProblemChild a great solution.

## Getting Started

We have released the model and the associated assets - including the pipelines, anomaly detection configurations, and detection rules - to the Integrations app in Kibana as of 8.0. We will be maintaining this format moving forward.

If you don’t have an Elastic Cloud cluster but would like to start experimenting with the released ProblemChild package, you can start a [free 14-day trial](https://cloud.elastic.co/registration) of Elastic Cloud.

We will now look at the steps to get ProblemChild up and running in your environment in a matter of minutes using the released Living off the land (LotL) detection package.

### Step 1: Installing the package assets

In Kibana, the Integrations app now includes the LotL Attack Detection package. To install the assets, click the `Install LotL Attack Detection assets` button under the `Settings` tab.

This will install all of the artifacts necessary to use the ProblemChild model to generate alerts when LotL activity is detected in your environment.

![To install the assets, click the `Install LotL Attack Detection assets` button under the `Settings` tab.](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-living-off-the-land-attack-1.png)

![To install the assets, click the `Install LotL Attack Detection assets` button under the `Settings` tab.](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-detecting-lotl-attacks-2.png)

Once installation is complete, you can navigate to **Stack Management > Ingest Pipelines** and see that the **`<version-number>-problem\_child\_ingest\_pipeline`** has been installed and can now be used to enrich incoming ingest data. The ingest pipeline leverages the **`<version-number>-problem\_child\_inference\_pipeline`** in order to do this.

![Once installation is complete, you can navigate to Stack Management > Ingest Pipelines and see that the `<version-number>-problem_child_ingest_pipeline` has been installed and can now be used to enrich incoming ingest data.](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-detecting-lotl-attacks-3.png)

Similarly, the installed ProblemChild model can now be seen in **Machine Learning > Model Management > Trained Models**

![Similarly, the installed ProblemChild model can now be seen in Machine Learning > Model Management > Trained Models](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-detecting-lotl-attacks-4.jpg)

### Step 2: Enriching your data

Now you are ready to ingest your data using the ingest pipeline. This will enrich your incoming data with predictions from the machine learning model.

This pipeline is designed to work with Windows process event data such as [Winlogbeat data](https://www.elastic.co/downloads/beats/winlogbeat). You can add the installed ingest pipeline to an Elastic beat by adding a simple [configuration setting](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html#pipelines-for-beats).

If you already have an ingest pipeline associated with your indices, you can use a [pipeline processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/pipeline-processor.html) to integrate the ProblemChild ingest pipeline into your existing pipeline.

You will also want to add the following mappings to the Elastic beat you chose:

```
{
  "properties": {
    "problemchild": {
      "properties": {
        "prediction": {
          "type": "long"
        },
        "prediction_probability": {
          "type": "float"
        }
      }
    },
    "blocklist_label": {
      "type": "long"
    }
  }
}

```

You can do this under **Stack Management > Index Management > Component Templates.** Templates that can be edited to add custom components will be marked with a _@custom_ suffix. Edit the _@custom_ component template for your Elastic beat by pasting the above JSON blob in the **Load JSON** flyout.

![](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/Screen_Shot_2022-07-29_at_8.13.52_AM.jpeg)

![](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/Screen_Shot_2022-07-29_at_8.14.10_AM.jpeg)

You should now see that the model enriches incoming Windows process events with the following fields:

**problemchild.prediction**

- A value of 1 indicates that the event is predicted to be malicious and a value of “0” indicates that the event is predicted to be benign.

**prediction_probability**

- A value between 0 and 1 indicating the confidence of the model in its prediction. The higher the value, the higher the confidence.

**blocklist_label**

- A value of 1 indicates that the event is malicious because one or more terms in the command line arguments matched a blocklist.

If you want an immediate way to test that the ingest pipeline is working as expected with your data, you can use a few sample documents with the [simulate pipeline API](https://www.elastic.co/guide/en/elasticsearch/reference/current/simulate-pipeline-api.html) and confirm you see the **problemchild** fields.

### Step 3: Running anomaly detection

The package includes several preconfigured anomaly detection jobs. These jobs enable you to find the rarest events among those detected as malicious by the supervised model in order to decide which events require immediate attention from your analysts.

To run these jobs on your enriched data, go to **Machine Learning > Anomaly Detection**. When you create a job using the job wizard, you should see an option to Use preconfigured jobs with a card for LotL Attacks. After selecting the card, you will see several preconfigured anomaly detection jobs that can be run. Note these jobs are only useful for indices that have been enriched by the ingest pipeline.

### Step 4: Enabling the rules

To maximize the benefit of the ProblemChild framework, activate the installed detection rules. They are triggered when certain conditions for the supervised model or anomaly detection jobs are satisfied. The complete list of the installed rules can be found in the **Overview** page of the package itself or in the latest experimental detections [release](https://github.com/elastic/detection-rules/releases/tag/ML-experimental-detections-20211130-7).

In order to enable and use the installed rules, you can navigate to **Security > Rules** and select `_Load Elastic prebuild rules and timeline templates`\_.

![In order to enable and use the installed rules, you can navigate to Security > Rules and select `Load Elastic prebuild rules and timeline templates`.](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-detecting-lotl-attacks-5.png)

Note that there are search rules as well as ML job rules. The search rules are triggered by the supervised model, for example this rule:

![The above rule matches on any Windows process event for which the supervised model or its blocklist has a prediction value of 1 (malicious).](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-detecting-lotl-attacks-6.jpg)

The above rule matches on any Windows process event for which the supervised model or its blocklist has a prediction value of 1 (malicious).

The ML job rules are triggered by anomalies found by the anomaly detection jobs that you set up in Step 3 — for example, this rule:

![The above rule is triggered each time the anomaly detection job problem_child_rare_process_by_host detects an anomaly with an anomaly score greater than or equal to 75.](/assets/images/detecting-living-off-the-land-attacks-with-new-elastic-integration/blog-elastic-detecting-lotl-attacks-6.jpg)

The above rule is triggered each time the anomaly detection job problem_child_rare_process_by_host detects an anomaly with an anomaly score greater than or equal to 75.

# Summary

As mentioned in the first blog post, the supervised ML component of ProblemChild is trained to predict a value of 1 (malicious) on processes or command line arguments that can be used for LotL attacks. This does not mean that everything that the supervised model predicts with a value 1 indicates LotL activity. The prediction value of 1 should be interpreted more as “this could be potentially malicious,” instead of “this is definitely LotL activity.”

The real beauty of ProblemChild is in the anomaly detection, wherein it surfaces rare parent-child process relationships from among the events the supervised model marked as suspicious. This not only helps in reducing the number of false positives, but also helps security analysts focus on a smaller, more targeted list for triage.

You could of course start with the search rules, which will alert directly on the results of the supervised model. If the number of alerts from these rules is manageable and you have the time and resources to drill into these alerts, you might not need to enable the anomaly detection jobs. However, if you then notice that these rules are producing too many alerts (which is usually the case in most large organizations), you may benefit from enabling the anomaly detection jobs and their corresponding rules.

# Get in touch with us

We’d love for you to try out ProblemChild and give us feedback as we work on adding new capabilities to it. If you run into any issues during the process, please reach out to us on our [community Slack channel](https://ela.st/slack), [discussion forums](https://discuss.elastic.co/c/security) or even our [open detections repository](https://github.com/elastic/detection-rules).

You can always experience the latest version of [Elasticsearch Service](https://www.elastic.co/elasticsearch/service) on Elastic Cloud and follow along with this blog to set up the ProblemChild framework in your environment for your Windows process event data. And take advantage of our [Quick Start training](https://www.elastic.co/training/elastic-security-quick-start) to set yourself up for success. Happy experimenting!
