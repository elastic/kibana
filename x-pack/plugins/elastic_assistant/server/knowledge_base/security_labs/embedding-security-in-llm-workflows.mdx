---
title: "Embedding Security in LLM Workflows: Elastic's Proactive Approach"
slug: "embedding-security-in-llm-workflows"
date: "2024-04-25"
subtitle: "Exploring Elastic's innovative approach for integrating security into the lifecycle of LLMs to safeguard against vulnerabilities featuring Elastic’s AI Assistant."
description: "Dive into Elastic's exploration of embedding security directly within Large Language Models (LLMs). Discover our strategies for detecting and mitigating several of the top OWASP vulnerabilities in LLM applications, ensuring safer and more secure AI-driven applications."
author:
  - slug: mika-ayenson
image: "Security Labs Images 5.jpg"
category:
  - slug: detection-science
  - slug: machine-learning
  - slug: generative-ai
---

We recently concluded one of our quarterly Elastic OnWeek events, which provides a unique week to explore opportunities outside of our regular day-to-day. In line with recent publications from [OWASP](https://owasp.org/www-project-top-10-for-large-language-model-applications/) and the [NSA AISC](https://media.defense.gov/2024/Apr/15/2003439257/-1/-1/0/CSI-DEPLOYING-AI-SYSTEMS-SECURELY.PDF), we decided to spend some time with the OWASP Top Ten vulnerabilities for LLMs natively in Elastic. In this article, we touch on a few opportunities to detect malicious LLM activity with [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html), namely:

 - LLM01: Prompt Injection
 - LLM02: Insecure Output Handling
 - LLM04: Model Denial of Service
 - LLM06: Sensitive Information Disclosure

Elastic provides the ability to audit LLM applications for malicious behaviors; we’ll show you one approach with just four steps:

 1. Intercepting and analyzing the LLM requests and responses 
 2. Enriching data with LLM-specific analysis results
 3. Sending data to Elastic Security
 4. Writing ES|QL detection rules that can later be used to respond 

This approach reflects our ongoing efforts to explore and implement advanced detection strategies, including developing detection rules tailored specifically for LLMs, while keeping pace with emerging generative AI technologies and security challenges. Building on this foundation, last year marked a significant enhancement to our toolkit and overall capability to continue this proactive path forward. 

Elastic [released](https://www.elastic.co/blog/introducing-elastic-ai-assistant) the AI Assistant for Security, introducing how the open generative AI sidekick is powered by the [Search AI Platform](https://www.elastic.co/platform) — a collection of relevant tools for developing advanced search applications. Backed by machine learning (ML) and artificial intelligence (AI), this AI Assistant provides powerful pre-built workflows like alert summarization, workflow suggestions, query conversions, and agent integration advice. I highly recommend you read more on Elastic’s [AI Assistant](https://www.elastic.co/elasticsearch/ai-assistant) about how the capabilities seamlessly span across Observability and Security.

We can use the  AI Assistant’s capabilities as a third-party LLM application to capture, audit, and analyze requests and responses for convenience and to run experiments. Once data is in an index, writing behavioral detections on it becomes business as usual —  we can also leverage the entire security detection engine. Even though we’re proxying the Elastic AI Assistant LLM activity in this experiment, it’s merely used as a vehicle to demonstrate auditing LLM-based applications. Furthermore, this proxy approach is intended for third-party applications to ship data to [Elastic Security](https://www.elastic.co/guide/en/security/current/es-overview.html). 

We can introduce security mechanisms into the application's lifecycle by intercepting LLM activity or leveraging observable LLM metrics. It’s common practice to address prompt-based threats by [implementing various safety tactics](https://platform.openai.com/docs/guides/safety-best-practices):

 1. **Clean Inputs**: Sanitize and validate user inputs before feeding them to the model
 2. **Content Moderation**: Use OpenAI tools to filter harmful prompts and outputs
 3. **Rate Limits and Monitoring**: Track usage patterns to detect suspicious activity
 4. **Allow/Blocklists**: Define acceptable or forbidden inputs for specific applications
 5. **Safe Prompt Engineering**: Design prebuilt prompts that guide the model towards intended outcomes
 6. **User Role Management**: Control user access to prevent unauthorized actions
 7. **Educate End-Users**: Promote responsible use of the model to mitigate risks
 8. **Red Teaming & Monitoring**: Test for vulnerabilities and continuously monitor for unexpected outputs
 9. **HITL Feedback for Model Training**: Learn from human-in-the-loop, flagged issues to refine the model over time
 10. **Restrict API Access**: Limit model access based on specific needs and user verification

Two powerful features provided by OpenAI, and many other LLM implementers, is the ability to [submit end-user IDs](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids) and check content against a [moderation API](https://platform.openai.com/docs/guides/moderation), features that set the bar for LLM safety. Sending hashed IDs along with the original request aids in abuse detection and provides targeted feedback, allowing unique user identification without sending personal information. Alternatively, OpenAI's moderation endpoint helps developers identify potentially harmful content like hate speech, self-harm encouragement, or violence, allowing them to filter such content. It even goes a step further by detecting threats and intent to self-harm. 

Despite all of the recommendations and best practices to protect against malicious prompts, we recognize that there is no single perfect solution. When using capabilities like OpenAI’s API, some of these threats may be detected by the content filter, which will respond with a usage policy violation notification:   

![Violation notification from OpenAI](/assets/images/embedding-security-in-llm-workflows/image5.png)


This content filtering is beneficial to address many issues; however, it cannot identify further threats in the broader context of the environment, application ecosystem, or other alerts that may appear. The more we can integrate generative AI use cases into our existing protection capabilities, the more control and possibilities we have to address potential threats. Furthermore, even if LLM safeguards are in place to stop rudimentary attacks, we can still use the detection engine to alert and take future remediation actions instead of silently blocking or permitting abuse. 

## Proxying LLM Requests and Setup

The optimal security solution integrates additional safeguards directly within the LLM application's ecosystem. This allows enriching alerts with the complete context surrounding requests and responses. As requests are sent to the LLM, we can intercept and analyze them for potential malicious activity. If necessary, a response action can be triggered to defer subsequent HTTP calls. Similarly, inspecting the LLM's response can uncover further signs of malicious behavior. 

Using a proxy to handle these interactions offers several advantages:

 - **Ease of Integration and Management**: By managing the new security code within a dedicated proxy application, you avoid embedding complex security logic directly into the main application. This approach minimizes changes needed in the existing application structure, allowing for easier maintenance and clearer separation of security from business logic. The main application must only be reconfigured to route its LLM requests through the proxy.
 - **Performance and Scalability**: Placing the proxy on a separate server isolates the security mechanisms and helps distribute the computational load. This can be crucial when scaling up operations or managing performance-intensive tasks, ensuring that the main application's performance remains unaffected by the additional security processing.

### Quick Start Option: Proxy with Flask

You can proxy incoming and outgoing LLM connections for a faster initial setup. This approach can be generalized for other LLM applications by creating a simple Python-based [Flask](https://flask.palletsprojects.com/en/3.0.x/) application. This application would intercept the communication, analyze it for security risks, and log relevant information before forwarding the response.

![Approach to Intercept Elastic Request/Responses](/assets/images/embedding-security-in-llm-workflows/image3.png)


Multiple SDKs exist to connect to Elasticsearch and handle OpenAI LLM requests. The provided [llm-detection-proxy](https://github.com/elastic/llm-detection-proxy) repo demonstrates the available Elastic and OpenAI clients. This snippet highlights the bulk of the experimental proxy in a single Flask route.

``` python
@app.route("/proxy/openai", methods=["POST"])
def azure_openai_proxy():
   """Proxy endpoint for Azure OpenAI requests."""
   data = request.get_json()
   messages = data.get("messages", [])
   response_content = ""
   error_response = None

   try:
       # Forward the request to Azure OpenAI
       response = client.chat.completions.create(model=deployment_name, messages=messages)
       response_content = response.choices[0].message.content  # Assuming one choice for simplicity
       choices = response.choices[0].model_dump()
   except openai.BadRequestError as e:
       # If BadRequestError is raised, capture the error details
       error_response = e.response.json().get("error", {}).get("innererror", {})
       response_content = e.response.json().get("error", {}).get("message")

       # Structure the response with the error details
       choices = {**error_response.get("content_filter_result", {}),
                  "error": response_content, "message": {"content": response_content}}

   # Perform additional analysis and create the Elastic document
   additional_analysis = analyze_and_enrich_request(prompt=messages[-1],
                                                    response_text=response_content,
                                                    error_response=error_response)
   log_data = {"request": {"messages": messages[-1]},
               "response": {"choices": response_content},
               **additional_analysis}

   # Log the last message and response
   log_to_elasticsearch(log_data)

   # Calculate token usage
   prompt_tokens = sum(len(message["content"]) for message in messages)
   completion_tokens = len(response_content)
   total_tokens = prompt_tokens + completion_tokens

   # Structure and return the response
   return jsonify({
       "choices": [choices],
       "usage": {
           "prompt_tokens": prompt_tokens,
           "completion_tokens": completion_tokens,
           "total_tokens": total_tokens,
       }
   })
```

With the Flask server, you can configure the [OpenAI Kibana Connector](https://www.elastic.co/guide/en/kibana/current/openai-action-type.html) to use your proxy. 

![](/assets/images/embedding-security-in-llm-workflows/image10.png)

Since this proxy to your LLM is running locally, credentials and connection information are managed outside of Elastic, and an empty string can be provided in the API key section. Before moving forward, testing your connection is generally a good idea. It is important to consider other security implications if you are considering implementing a proxy solution in a real environment - not something this prototype considered for brevity.

![Sample screenshot of the AI Assistant operating through the prototype proxy](/assets/images/embedding-security-in-llm-workflows/image4.png)


We can now index our LLM requests and responses and begin to write detections on the available data in the ```azure-openai-logs``` index created in this experiment. Optionally, we could preprocess the data using an Elastic [ingestion pipeline](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html), but in this contrived example, we can effectively write detections with the power of ES|QL.

![Sample AzureOpenAI LLM Request/Response Data
Langsmith Proxy](/assets/images/embedding-security-in-llm-workflows/image13.png)
Sample AzureOpenAI LLM Request/Response Data

### Langsmith Proxy

*Note: The [Langsmith Proxy](https://docs.smith.langchain.com/proxy/quickstart) project provides a dockerized proxy for your LLM APIs. While it offers a minimized solution, as of this writing, it lacks native capabilities for incorporating custom security analysis tools or integrating directly with Elastic Security.*

The LangSmith Proxy is designed to simplify LLM API interaction. It's a sidecar application requiring minimal configuration (e.g., LLM API URL). It enhances performance (caching, streaming) for high-traffic scenarios. It uses NGINX for efficiency and supports optional tracing for detailed LLM interaction tracking. Currently, it works with OpenAI and AzureOpenAI, with future support planned for other LLMs.

## LLM Potential Attacks and Detection Rule Opportunities

**It’s important to understand that even though documented lists of protections do not accompany some LLMs, simply trying some of these prompts may be immediately denied or result in banning on whatever platform used to submit the prompt. We recommend experimenting with caution and understand the SLA prior to sending any malicious prompts. Since this exploration leverages OpenAI’s resources, we recommend following the bugcrowd [guidance](https://bugcrowd.com/openai) and sign up for an additional testing account using your @bugcrowdninja.com email address.**

Here is a list of several plausible examples to illustrate detection opportunities. Each LLM topic includes the OWASP description, an example prompt, a sample document, the detection opportunity, and potential actions users could take if integrating additional security mechanisms in their workflow. 

While this list is currently not extensive, Elastic Security Labs is currently undertaking a number of initiatives to ensure future development, and formalization of rules will continue.

### LLM01 - prompt injection

**OWASP Description**: Manipulating LLMs via crafted inputs can lead to unauthorized access, data breaches, and compromised decision-making. Reference [here](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM01_PromptInjection.md).

**Example**: An adversary might try to craft prompts that trick the LLM into executing unintended actions or revealing sensitive information. *Note: Tools like [promptmap](https://github.com/utkusen/promptmap) are available to generate creative prompt injection ideas and automate the testing process.*

**Prompt**:
![](/assets/images/embedding-security-in-llm-workflows/image7.png)

**Sample Response**:
![](/assets/images/embedding-security-in-llm-workflows/image8.png)

**Detection Rule Opportunity**: In this example, the LLM responded by refusing to handle database connection strings due to security risks. It emphasizes keeping credentials private and suggests using secure methods like environment variables or vaults to protect them.

A very brittle but basic indicator-matching query may look like this:

``` sql
FROM azure-openai-logs |
   WHERE request.messages.content LIKE "*generate*connection*string*"
   OR request.messages.content LIKE "*credentials*password*username*"
   OR response.choices LIKE "*I'm sorry, but I can't assist*"
```

A slightly more advanced query detects more than two similar attempts within the last day. 

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() -  1 DAY
| WHERE request.messages.content LIKE "*credentials*password*username*"
   OR response.choices LIKE "*I'm*sorry,*but*I*can't*assist*"
   OR response.choices LIKE "*I*can’t*process*actual*sensitive*"
| stats total_attempts = count(*) by connectorId
| WHERE total_attempts >= 2
```

*Note that there are many approaches to detect malicious prompts and protect LLM responses. Relying on these indicators alone is not the best approach; however, we can gradually improve the detection with additional enrichment or numerous response attempts. Furthermore, if we introduce an ID into our documents, we can further enhance our query by aggregating attempts based on the field that correlates to a specific user.*

**Example 2**: The [Crescendo](https://arxiv.org/abs/2404.01833v1) effect is a realistic jailbreak attack where an adversary gradually manipulates a language model through a series of seemingly innocent inquiries that shift towards asking the model to describe hypothetical scenarios involving the unauthorized access and manipulation of secure systems. By doing so, they aim to extract methods that could potentially bypass the LLM’s security constraints.

**Prompt**:
![](/assets/images/embedding-security-in-llm-workflows/image15.png)

**Sample Response**:
![](/assets/images/embedding-security-in-llm-workflows/image17.png)

With the additional analysis from OpenAI’s filtering, we can immediately detect the first occurrence of abuse. 

**Detection Rule Opportunity**:
``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() - 1 DAY
 AND (
     request.messages.content LIKE "*credentials*password*username*"
     OR response.choices LIKE "*I'm sorry, but I can't assist*"
     OR analysis.openai.code == "ResponsibleAIPolicyViolation"
     OR malicious
 )
| STATS total_attempts = COUNT(*) BY connectorId
| WHERE total_attempts > 1
| SORT total_attempts DESC
```

However, as you continue to use the Crescendo Effect, we notice that the conversation pivot goes unblocked after the initial content filter by OpenAI. It’s important to understand that even if tactics like this are difficult to prevent, we still have opportunities to detect.

![](/assets/images/embedding-security-in-llm-workflows/image6.png)

Additional analysis tools, like LLM-Guard, detect if the conversation is sensitive, which, in this case, is inaccurate. However, it hints at potential opportunities to track malicious behavior over multiple prompts. Note: We could also take advantage of EQL sequences as an alternative to this ES|QL query to help track behaviors over multiple events.

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() - 1 DAY
 AND (
     request.messages.content LIKE "*Molotov*"
     OR analysis.openai.code == "ResponsibleAIPolicyViolation"
     OR malicious
 )
| STATS attempts = count(*), max_sensitivity = max(analysis.llm_guard_response_scores.Sensitive) BY connectorId
| WHERE attempts >= 1 AND max_sensitivity > 0.5
| SORT attempts DESC
```

This query detects suspicious behavior related to Molotov Cocktails across multiple events by analyzing sequences of log entries associated with a single user/session (identified by connectorId). The query core filters events based on:

 - **Content Matching**: It searches for mentions of "Molotov" in conversation content (```request.messages.content LIKE "*Molotov*"```)
 - **Policy Violations: It identifies attempts blocked by OpenAI's safety filters (```analysis.openai.code == "ResponsibleAIPolicyViolation"```), indicating the start of potentially suspicious behavior
 - **Malicious Flag Consideration**: It includes logs where the system flagged the content as malicious (```malicious == true```), capturing potentially subtle or varied mentions
 - **Session-Level Analysis**: By grouping events by connectorId, it analyzes the complete sequence of attempts within a session. It then calculates the total number of attempts (```attempts = count(*)```) and the highest sensitivity score (```max_sensitivity = max(analysis.llm_guard_response_scores.Sensitive)```) across all attempts in that session
 - **Flagging High-Risk Sessions**: It filters sessions with at least one attempt (```attempts >= 1```) and a maximum sensitivity score exceeding 0.5 (```max_sensitivity > 0.5```). This threshold helps focus on sessions where users persistently discussed or revealed potentially risky content.

By analyzing these factors across multiple events within a session, we can start building an approach to detect a pattern of escalating discussions, even if individual events might not be flagged alone. 

### LLM02 - insecure output handling

**OWASP Description**: Neglecting to validate LLM outputs may lead to downstream security exploits, including code execution that compromises systems and exposes data. Reference [here](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM02_InsecureOutputHandling.md).

**Example**: An adversary may attempt to exploit the LLM to generate outputs that can be used for cross-site scripting (XSS) or other injection attacks.

**Prompt**:
![](/assets/images/embedding-security-in-llm-workflows/image9.png)

**Sample Response**:
![](/assets/images/embedding-security-in-llm-workflows/image12.png)

**Detection Rule Opportunity**:

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() - 1 DAY
| WHERE (
   response.choices LIKE "*<script>*"
   OR response.choices LIKE "*document.cookie*"
   OR response.choices LIKE "*<img src=x onerror=*"
   OR response.choices LIKE "*<svg/onload=*"
   OR response.choices LIKE "*javascript:alert*"
   OR response.choices LIKE "*<iframe src=# onmouseover=*"
   OR response.choices LIKE "*<img ''><script>*"
   OR response.choices LIKE "*<IMG SRC=javascript:alert(String.fromCharCode(88,83,83))>*"
   OR response.choices LIKE "*<IMG SRC=# onmouseover=alert('xxs')>*"
   OR response.choices LIKE "*<IMG onmouseover=alert('xxs')>*"
   OR response.choices LIKE "*<IMG SRC=/ onerror=alert(String.fromCharCode(88,83,83))>*"
   OR response.choices LIKE "*&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041>*"
   OR response.choices LIKE "*<IMG SRC=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>*"
   OR response.choices LIKE "*<IMG SRC=\"jav&#x0A;ascript:alert('XSS');\">*"
)
| stats total_attempts = COUNT(*), users = COUNT_DISTINCT(connectorId)
| WHERE total_attempts >= 2
```

This pseudo query detects potential insecure output handling by identifying LLM responses containing scripting elements or cookie access attempts, which are common in Cross-Site Scripting (XSS) attacks. It is a shell that could be extended by allow or block lists for well-known keywords. 

### LLM04 - model DoS

**OWASP Description**: Overloading LLMs with resource-heavy operations can cause service disruptions and increased costs. Reference [here](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM04_ModelDoS.md).

**Example**: An adversary may send complex prompts that consume excessive computational resources. 

**Prompt**:
![](/assets/images/embedding-security-in-llm-workflows/image2.png)

**Sample Response**:
![](/assets/images/embedding-security-in-llm-workflows/image18.png)

Detection Rule Opportunity:

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() -  1 DAY
| WHERE response.choices LIKE "*requires*significant*computational*resources*"
| stats total_attempts = COUNT(*), users = COUNT_DISTINCT(connectorId)
| WHERE total_attempts >= 2
```

This detection illustrates another simple example of how the LLM response is used to identify potentially abusive behavior. Although this example may not represent a traditional security threat, it could emulate how adversaries can impose costs on victims, either consuming resources or tokens. 

**Example 2**: An adversary may send complex prompts that consume excessive computational resources. 

**Prompt**:
![](/assets/images/embedding-security-in-llm-workflows/image16.png)

**Sample Response**:
![](/assets/images/embedding-security-in-llm-workflows/image14.png)

At a glance, this prompt appears to be benign. However, excessive requests and verbose responses in a short time can significantly increase costs. 

**Detection Rule Opportunity**:

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() - 1 HOUR
| STATS request_count = COUNT(*), distinct_prompts = COUNT_DISTINCT(request.messages.content) BY connectorId
| WHERE request_count > 50 AND distinct_prompts > 10
| SORT request_count DESC
```

In the context of example 2, this working query efficiently tracks and analyzes usage patterns by counting all requests and distinct prompt contents for each ```connectorId``` from the ```azure-openai-logs``` over the past hour. If any ```connectorId``` submits over 50 requests with more than ten unique prompts within this timeframe, it indicates a potential misuse pattern like the one described, where an adversary might be modifying queries to probe encryption algorithm details, potentially causing undue load or evading detection systems. The results are then ordered to prioritize the ```connectorIds``` with the highest request counts, which helps quickly identify the most active or suspicious sources.

### LLM06 - sensitive information disclosure

**OWASP Description**: Failure to protect against disclosure of sensitive information in LLM outputs can result in legal consequences or a loss of competitive advantage. Reference [here](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM06_SensitiveInformationDisclosure.md).

**Example**: An adversary may craft prompts to extract sensitive information embedded in the training data. 

**Prompt**:
![](/assets/images/embedding-security-in-llm-workflows/image1.png)

**Sample Response**:
![](/assets/images/embedding-security-in-llm-workflows/image19.png)

Detection Rule Opportunity:

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() - 1 DAY
| WHERE request.messages.content LIKE "*common*passwords*used*in*the*dataset*" AND malicious
| stats total_attempts = COUNT(*), users = COUNT_DISTINCT(connectorId)
 BY identified_threats.keyword, analysis.langkit_score
| WHERE total_attempts >= 2
```

This query searches for logs from the last day that contain requests specifically asking about "common passwords used in the dataset" to train the model and where such requests are flagged as malicious. It aggregates these logs to count the number of such attempts and identifies distinct users involved, grouped by any identified threats and the language kit score. With some enrichment, the inclusion of ```AND malicious = true``` ensures focus on requests already flagged as potentially harmful, helping to prioritize investigation and response actions.

## Enriching Detection Rules with Security Insights

By routing LLM requests through a proxy, we can capitalize on specialized security tools to analyze each request for signs of malicious intent. Upon detection, the original request can be enriched with additional metadata indicating the likelihood of malicious content and the specific type of threat it represents. This enriched data is then indexed in Elasticsearch, creating a robust monitoring, alerting, and retrospective analysis dataset. With this enrichment, the LLM detection opportunities from the last section are possible.

We don’t deep-dive on every tool available, but several open-source tools have emerged to offer varying approaches to analyzing and securing LLM interactions. Some of these tools are backed by machine learning models trained to detect malicious prompts:

 - **Rebuff** ([GitHub](https://github.com/protectai/rebuff)): Utilizes machine learning to identify and mitigate attempts at social engineering, phishing, and other malicious activities through LLM interactions. Example usage involves passing request content through Rebuff's analysis engine and tagging requests with a "malicious" boolean field based on the findings. 
 - **LLM-Guard** ([GitHub](https://github.com/protectai/llm-guard)): Provides a rule-based engine for detecting harmful patterns in LLM requests. LLM-Guard can categorize detected threats based on predefined categories, enriching requests with detailed threat classifications. 
 - **LangKit** ([GitHub](https://github.com/whylabs/langkit/tree/main)): A toolkit designed for monitoring and securing LLMs, LangKit can analyze request content for signs of adversarial inputs or unintended model behaviors. It offers hooks for integrating custom analysis functions.
 - **Vigil-LLM** ([GitHub](https://github.com/deadbits/vigil-llm)): Focuses on real-time monitoring and alerting for suspicious LLM requests. Integration into the proxy layer allows for immediate flagging potential security issues, enriching the request data with vigilance scores.
 - **Open-Prompt Injection** ([GitHub](https://github.com/liu00222/Open-Prompt-Injection)): Offers methodologies and tools for detecting prompt injection attacks, allowing for the enrichment of request data with specific indicators of compromise related to prompt injection techniques.

*Note: Most of these tools require additional calls/costs to an external LLM, and would require further infrastructure to threat hunt effectively.*

One simple example implementation that uses LLM-guard and LangKit might look like this:

``` python
def analyze_and_enrich_request(
   prompt: str, response_text: str, error_response: Optional[dict] = None
) -> dict:
   """Analyze the prompt and response text for malicious content and enrich the document."""

   # LLM Guard analysis
   sanitized_prompt, results_valid_prompt, results_score_prompt = scan_prompt(
       input_scanners, prompt["content"]
   )
   (
       sanitized_response_text,
       results_valid_response,
       results_score_response,
   ) = scan_output(output_scanners, sanitized_prompt, response_text)

   # LangKit for additional analysis
   schema = injections.init()
   langkit_result = extract({"prompt": prompt["content"]}, schema=schema)

   # Initialize identified threats and malicious flag
   identified_threats = []

   # Check LLM Guard results for prompt
   if not any(results_valid_prompt.values()):
       identified_threats.append("LLM Guard Prompt Invalid")

   # Check LLM Guard results for response
   if not any(results_valid_response.values()):
       identified_threats.append("LLM Guard Response Invalid")

   # Check LangKit result for prompt injection
   prompt_injection_score = langkit_result.get("prompt.injection", 0)
   if prompt_injection_score > 0.4:  # Adjust threshold as needed
       identified_threats.append("LangKit Injection")

   # Identify threats based on LLM Guard scores
   for category, score in results_score_response.items():
       if score > 0.5:
           identified_threats.append(category)

   # Combine results and enrich document
   # llm_guard scores map scanner names to float values of risk scores,
   # where 0 is no risk, and 1 is high risk.
   # langkit_score is a float value of the risk score for prompt injection
   # based on known threats.
   enriched_document = {
       "analysis": {
           "llm_guard_prompt_scores": results_score_prompt,
           "llm_guard_response_scores": results_score_response,
           "langkit_score": prompt_injection_score,
       },
       "malicious": any(identified_threats),
       "identified_threats": identified_threats,
   }

   # Check if there was an error from OpenAI and enrich the analysis
   if error_response:
       code = error_response.get("code")
       filtered_categories = {
           category: info["filtered"]
           for category, info in error_response.get(
               "content_filter_result", {}
           ).items()
       }

       enriched_document["analysis"]["openai"] = {
           "code": code,
           "filtered_categories": filtered_categories,
       }
       if code == "ResponsibleAIPolicyViolation":
           enriched_document["malicious"] = True

   return enriched_document
```

This function could be called for each request passing through the proxy, with the returned data being appended to the request document before it's sent to Elasticsearch. The result is a detailed and actionable dataset that captures the raw interactions with the LLM and provides immediate security insights to embed in our detection rules based on the request and response. Going full circle with the prompt injection LLM01 example, the query could be updated to something like this:

``` sql
FROM azure-openai-logs
| WHERE @timestamp > NOW() - 1 DAY
| WHERE identified_threats.keyword == "LangKit Injection" OR analysis.langkit_score > 0.4
| stats total_attempts = count(*), users = count_distinct(connectorId) by identified_threats.keyword, analysis.langkit_score
| WHERE users == 1 and total_attempts >= 2
```

As you can see, both scoring mechanisms are subjective based on the results returned from the open source prompt analysis tools. This query filters logs from the past day where the identified threat is "LangKit Injection" or the LangKit score is above ```0.4```. It then calculates the total attempts and counts the number of unique users (agents) associated with each identified threat category and LangKit score, filtering to include only cases where there's a single user involved (```users == 1```) and the total attempts are two or more (```total_attempts >= 2```).

With these additional tools, we have a variety of analysis result fields available to improve our detection rules. In these examples, we shipped most of the data as-is for simplicity. However, in a production environment, it's crucial to normalize these fields across all tools and LLM responses to a schema like [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) (ECS). Normalizing data to ECS enhances interoperability between different data sources, simplifies analysis, and streamlines the creation of more effective and cohesive security rules.

In Part two of this series, we will discuss how we’ve taken a more formal approach to ECS field mapping, and integrations.

## Alternative Options for LLM Application Auditing

While using a proxy may be straightforward, other approaches may better suit a production setup; for example: 

 - Utilizing [application performance monitoring](https://www.elastic.co/observability/application-performance-monitoring) (APM) 
 - Using the OpenTelemetry integration
 - Modifying changes in Kibana directly to audit and trace LLM activity

Unsurprisingly, these approaches have potential limitations like not natively ingesting all the LLM security analysis tool data generated without developing custom logic to support third-party tools.

### Leveraging Elastic APM for In-Depth Application Insights

Elastic [APM](https://www.elastic.co/guide/en/observability/current/apm.html) provides an alternative solution for monitoring applications in real-time, essential for detecting performance bottlenecks and identifying problematic requests or queries. By integrating Elastic APM, users gain detailed insights into transaction times, database query performance, external API call efficiency, and more. This comprehensive visibility makes it easier to address and resolve performance issues or errors quickly. Unlike the proxy approach, APM automatically ingests logs into Elastic about your application, providing an opportunity to create security detection rules based on the behaviors seen within your data.

### Utilizing OpenTelemetry for Enhanced Observability

For applications already employing OpenTelemetry, leveraging its [integration](https://www.elastic.co/guide/en/observability/current/apm-open-telemetry.html) with Elastic APM can enhance observability without requiring extensive instrumentation changes. This integration supports capturing a wide array of telemetry data, including traces and metrics, which can be seamlessly sent to the Elastic Stack. This approach allows developers to continue using familiar libraries while benefiting from the robust monitoring capabilities of Elastic. OpenTelemetry’s compatibility across multiple programming languages and its [support through Elastic’s native protocol](https://www.elastic.co/guide/en/observability/current/apm-open-telemetry.html) (OTLP) facilitate straightforward data transmission, providing a robust foundation for monitoring distributed systems. Compared to the proxy example, this approach more natively ingests data than maintaining an independent index and logging mechanism to Elastic. 

### LLM Auditing with Kibana

Like writing custom logic for your LLM application to audit and ship data, you can test the approach with Elastic’s AI Assistant. If you're comfortable with TypeScript, consider deploying a local Elastic instance using the Kibana [Getting Started Guide](https://www.elastic.co/guide/en/kibana/current/development-getting-started.html). Once set up, navigate to the [Elastic AI Assistant](https://github.com/elastic/kibana/tree/main/x-pack/plugins/elastic_assistant) and configure it to intercept LLM requests and responses for auditing and analysis. Note: This approach primarily tracks Elastic-specific LLM integration compared to using APM and other integrations or a proxy to track third-party applications. It should only be considered for experimentation and exploratory testing purposes. 

Fortunately, Kibana is already instrumented with APM, so if you configure an APM server, you will automatically start ingesting logs from this source (by setting ```elastic.apm.active: true```). See the [README](https://github.com/elastic/kibana/blob/main/x-pack/plugins/elastic_assistant/server/lib/langchain/tracers/README.mdx) for more details.

## Closing Thoughts

As we continue with this exploration into integrating security practices within the lifecycle of large language models at Elastic, it's clear that embedding security into LLM workflows can provide a path forward for creating safer and more reliable applications. These contrived examples, drawn from our work during OnWeek, illustrate how someone can proactively detect, alert, and triage malicious activity, leveraging the security solutions that analysts find most intuitive and effective. 

It’s also worth noting that with the example proxy approach, we can incorporate a model to actively detect and prevent requests. Additionally, we can triage the LLM response before sending it back to the user if we’ve identified malicious threats. At this point, we have the flexibility to extend our security protections to cover a variety of defensive approaches. In this case, there is a fine line between security and performance, as each additional check will consume time and impede the natural conversational flow that users would expect.

Feel free to check out the proof-of-concept proxy at [llm-detection-proxy](https://github.com/elastic/llm-detection-proxy) and adapt it to fit your needs!

We’re always interested in hearing use cases and workflows like these, so as always, reach out to us via [GitHub issues](https://github.com/elastic/detection-rules/issues), chat with us in our [community Slack](http://ela.st/slack), and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80).

*The release and timing of any features or functionality described in this post remain at Elastic's sole discretion. Any features or functionality not currently available may not be delivered on time or at all.*
