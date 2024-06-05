---
title: "Using LLMs to summarize user sessions"
slug: "using-llms-to-summarize-user-sessions"
date: "2023-09-11"
description: "In this publication, we will talk about lessons learned and key takeaways from our experiments using GPT-4 to summarize user sessions."
author:
  - slug: apoorva-joshi
  - slug: kirti-sodhi
  - slug: susan-chang
image: "photo-edited-01@2x.jpg"
category:
  - slug: detection-science
  - slug: machine-learning
  - slug: generative-ai
---

## Using LLMs to summarize user sessions
With the introduction of the [AI Assistant](https://www.elastic.co/guide/en/security/current/security-assistant.html) into the Security Solution in 8.8, the Security Machine Learning team at Elastic has been exploring how to optimize Security operations with LLMs like GPT-4. User session summarization seemed like the perfect use case to start experimenting with for several reasons:
 - User session summaries can help analysts quickly decide whether a particular session's activity is worth investigating or not
 - Given the diversity of data that LLMs like GPT-4 are trained on, it is not hard to imagine that they have already been trained on [man pages](https://en.wikipedia.org/wiki/Man_page), and other open Security content, which can provide useful context for session investigation
 - Session summaries could potentially serve as a good supplement to the [Session View](https://www.elastic.co/guide/en/security/current/session-view.html) tool, which is available in the Elastic Security Solution as of 8.2.

In this publication, we will talk about lessons learned and key takeaways from our experiments using GPT-4 to summarize user sessions.

In our [follow-on research](https://www.elastic.co/security-labs/using-llms-and-esre-to-find-similar-user-sessions), we dedicated some time to examine sessions that shared similarities. These similar sessions can subsequently aid the analysts in identifying related suspicious activities.

## What is a session?
In Linux, and other Unix-like systems, a "user session" refers to the period during which a user is logged into the system. A session begins when a user logs into the system, either via graphical login managers (GDM, LightDM) or via command-line interfaces (terminal, SSH). 

Upon starting a Linux Kernel, a special process called the "init' process is created, which is responsible for starting configured services such as databases, web servers, and remote access services such as `sshd`. These services, and any shells or processes spawned by them, are typically encapsulated within their own sessions and tied together by a single session ID (SID).

The detailed and chronological process information captured by sessions makes them an extremely useful asset for alerting, compliance, and threat hunting.

## Lessons learned
For our experiments, we used a GPT-4 deployment with a 32k token limit available via Azure AI Studio. Tokens are basic units of text or code that LLMs use to process and generate language. Our goal here was to see how far we can get with user session summarization within the prompting paradigm alone. We learned some things along the way as it related to data processing, prompt engineering, hallucinations, parameter tuning, and evaluating the GPT summaries.

### Data processing
*Takeaway:* An aggregated JSON snapshot of the session is an effective input format for summarization.

A session here is simply a collection of process, network, file, and alert events. The number of events in a user session can range from a handful (< 10) to hundreds of thousands. Each event log itself can be quite verbose, containing several hundred fields. For longer sessions with a large number of events, one can quickly run into token limits for models like GPT-4. Hence, passing raw logs as input to GPT-4 is not as useful for our specific use case. We saw this during experimentation, even when using tabular formats such as CSV, and using a small subset of fields in the logs. 

![Max token limit (32k) is reached for sessions containing a few hundred events](/assets/images/using-llms-to-summarize-user-sessions/image1.png)

To get around this issue, we had to come up with an input format that retains as much of the session's context as possible, while also keeping the number of input tokens more or less constant irrespective of the length of the session. We experimented with several log de-duplication and aggregation strategies and found that an aggregated JSON snapshot of the session works well for summarization. An example document is as follows:

![Aggregated JSON snapshot of session activity](/assets/images/using-llms-to-summarize-user-sessions/image3.jpg)

This JSON snapshot highlights the most prominent activities in the session using de-duplicated lists, aggregate counts, and top-N (20 in our case) most frequent terms, with self-explanatory field names. 

### Prompt engineering
*Takeaway:* Few-shot tuning with high-level instructions worked best.

Apart from data processing, most of our time during experimentation was spent on prompt tuning. We started with a basic prompt and found that the model had a hard time connecting the dots to produce a useful summary:

```
You are an AI assistant that helps people find information.
```

We then tried providing very detailed instructions in the prompt but noticed that the model ignored some of the instructions:

```
You are a cybersecurity assistant, who helps Security analysts in summarizing activities that transpired in a Linux session. A summary of events that occurred in the session will be provided in JSON format. No need to explicitly list out process names and file paths. Summarize the session in ~3 paragraphs, focusing on the following: 
- Entities involved in the session: host name and user names.
- Overview of any network activity. What major source and destination ips are involved? Any malicious port activity?
- Overview of any file activity. Were any sensitive files or directories accessed?
- Highlight any other important process activity
- Looking at the process, network, and file activity, what is the user trying to do in the session? Does the activity indicate malicious behavior?
```

Based on the above prompt, the model did not reliably adhere to the 3 paragraph request and also listed out process names and file paths which it was explicitly told not to do. 

Finally, we landed on the following prompt that provided high-level instructions for the model:

```
Analyze the following Linux user session, focusing on:      
- Identifying the host and user names      
- Observing activities and identifying key patterns or trends      
- Noting any indications of malicious or suspicious behavior such as tunneling or encrypted traffic, login failures, access to sensitive files, large number of file creations and deletions, disabling or modifying Security software, use of Shadow IT, unusual parent-child process executions, long-running processes
- Conclude with a comprehensive summary of what the user might be trying to do in the session, based on the process, network, and file activity     
 ###
 Text: {your input here}
```

We also noticed that the model follows instructions more closely when they're provided in user prompts rather than in the system prompts (a system prompt is the initial instruction to the model telling it how it should behave and the user prompts are the questions/queries asked by a user to the model). After the above prompt, we were happy with the content of the summaries, but the output format was inconsistent, with the model switching between paragraphs and bulleted lists. We were able to resolve this with [few-shot tuning](https://arxiv.org/pdf/2203.04291.pdf), by providing the model with two examples of user prompts vs. expected responses. 

### Hallucinations
*Takeaway:* The model occasionally hallucinates while generating net new content for the summaries.

We observed that the model does not typically [hallucinate](https://arxiv.org/pdf/2110.10819.pdf) while summarizing facts that are immediately apparent in the input such as user and host entities, network ports, etc. Occasionally, the model hallucinates while summarizing information that is not obvious, for example, in this case summarizing the overall user intent in the session. Some relatively easy avenues we found to mitigate hallucinations were as follows:
 - Prompt the model to focus on specific behaviors while summarizing
 - Re-iterate that the model should fact-check its output
 - Set the [temperature](https://learnprompting.org/docs/basics/configuration_hyperparameters) to a low value (less than or equal to 0.2) to get the model to generate less diverse responses, hence reducing the chances of hallucinations
 - Limit the response length, thus reducing the opportunity for the model to go off-track — This works especially  well if the length of the texts to be summarized is more or less constant, which it was in our case

### Parameter tuning
*Takeaway:* Temperature = 0 does not guarantee determinism.

For summarization, we explored tuning parameters such as [Temperature and Top P](https://txt.cohere.com/llm-parameters-best-outputs-language-ai/), to get deterministic responses from the model. Our observations were as follows:
 - Tuning both together is not recommended, and it's also difficult to observe the effect of each when combined
 - Solely setting the temperature to a low value (< 0.2) without altering Top P is usually sufficient
 - Even setting the temperature to 0 does not result in fully deterministic outputs given the inherent non-deterministic nature of floating point calculations (see [this](https://community.openai.com/t/a-question-on-determinism/8185) post from OpenAI for a more detailed explanation)              

## Evaluating GPT Summaries
As with any modeling task, evaluating the GPT summaries was crucial in gauging the quality and reliability of the model outcomes. In the absence of standardized evaluation approaches and metrics for text generation, we decided to do a qualitative human evaluation of the summaries, as well as a quantitative evaluation using automatic metrics such as [ROUGE-L](https://en.wikipedia.org/wiki/ROUGE_(metric)), [BLEU](https://en.wikipedia.org/wiki/BLEU), [METEOR](https://en.wikipedia.org/wiki/METEOR), [BERTScore](https://arxiv.org/abs/1904.09675), and [BLANC](https://aclanthology.org/2020.eval4nlp-1.2/). 

For qualitative evaluation, we had a Security Researcher write summaries for a carefully chosen (to get a good distribution of short and long sessions) set of 10 sessions, without any knowledge of the GPT summaries. Three evaluators were asked to compare the GPT summaries against the human-generated summaries using three key criteria: 
 - Factuality:  Examine if the model summary retains key facts of the session as provided by Security experts
 - Authenticity: Check for hallucinations
 - Consistency: Check the consistency of the model output i.e. all the responses share a stable format and produce the same level of detail

Finally, each of the 10 summaries was assigned a final rating of "Good" or "Bad" based on a majority vote to combine the evaluators' choices.

![Summarization evaluation matrix](/assets/images/using-llms-to-summarize-user-sessions/image2.png)

While we recognize the small dataset size for evaluation, our qualitative assessment showed that GPT summaries aligned with human summaries 80% of the time. For the GPT summaries that received a "Bad" rating, the summaries didn't retain certain important facts because the aggregated JSON document only kept the top-N terms for certain fields. 

The automated metrics didn't seem to match human preferences, nor did they reliably measure summary quality due to the structural differences between human and LLM-generated summaries, especially for reference-based metrics.

## What's next
We are currently looking into further improving summarization via [retrieval augmented generation (RAG)](https://arxiv.org/pdf/2005.11401.pdf), using tools in the [Elastic Search and Relevance Engine (ESRE)](https://www.elastic.co/guide/en/esre/current/index.html). We also experimented with using LLMs to categorize user sessions. Stay tuned for Part 2 of this blog to learn more about those experiments!

In the meantime, we’d love to hear about your experiments with LLMs, ESRE, etc. If you'd like to share what you're doing or run into any issues during the process, please reach out to us on our [community Slack channel](https://ela.st/slack) and [discussion forums](https://discuss.elastic.co/c/security). Happy experimenting!
