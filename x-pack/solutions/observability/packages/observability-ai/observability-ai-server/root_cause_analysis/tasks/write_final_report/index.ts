/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RCA_PROMPT_TIMELINE_GUIDE, RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { RootCauseAnalysisContext } from '../../types';
import { stringifySummaries } from '../../util/stringify_summaries';

const SYSTEM_PROMPT_ADDENDUM = `
# Guide: Writing a Root Cause Analysis (RCA) Report

A Root Cause Analysis (RCA) report is the final step in a thorough
investigation. Its purpose is to provide a clear, evidence-backed explanation of
the underlying cause of an issue, as well as the impact. Even if no definitive
root cause is identified, the report should reflect the findings, the hypotheses
considered, and why certain assumptions were rejected. This guide will help
structure an RCA that distinguishes between cause and effect, organizes
evidence, and presents a timeline of key events.

---

## 1. Introduction

Start by summarizing the reason for the investigation. Provide a brief overview
of the incident, the affected services or entities, and the initial alerts or
issues that triggered the investigation. 

- **What prompted the investigation?**
- **Which entities were investigated?**
- **Was there a specific hypothesis proposed at the outset?**

### Example:
- **Overview:** This RCA report investigates the elevated error rates in
\`myservice\` and its downstream dependencies, first identified through an SLO
breach for the \`/api/submit\` endpoint. The investigation considered multiple
entities and possible causes, including resource exhaustion and upstream service
failures.

---

## 2. Investigation Summary

Summarize the key steps of the investigation, outlining:
- **What hypotheses were proposed and why.**
- **Which entities were investigated (e.g., \`myservice\`, \`myotherservice\`,
\`notification-service\`).**
- **Which hypotheses were discarded and why.**

For each hypothesis, present the supporting or contradicting evidence.

- **Strong Indicators:** Clear, repeated evidence pointing toward or against a
hypothesis.
- **Weak Indicators:** Inconsistent or ambiguous data that did not provide
conclusive answers.

#### Example Format:
- **Hypothesis 1:** Resource exhaustion in \`myservice\` caused elevated error
rates.
  - **Evidence:**
    - **Strong:** Memory usage exceeded 90% during the incident.
    - **Weak:** CPU usage remained stable, making resource exhaustion a partial
explanation.

- **Hypothesis 2:** Upstream latency from \`myotherservice\` caused delays.
  - **Evidence:**
    - **Strong:** API logs showed frequent retries and timeouts from
\`myotherservice\`.
    - **Weak:** No errors were observed in \`myotherservice\` logs, suggesting an
issue isolated to \`myservice\`.

---

## 3. Cause and Effect

Differentiate between the **cause** (what initiated the issue) and the
**effect** (the impact or symptoms seen across the system). The cause should
focus on the root, while the effect describes the wider system response or
failure.

- **Root Cause:** Identify the underlying problem, supported by strong evidence.
If no root cause is found, clearly state that the investigation did not lead to
a conclusive root cause.
  
- **Impact:** Describe the downstream effects on other services, performance
degradation, or SLO violations.

#### Example:
- **Cause:** The root cause of the elevated error rate was identified as a
memory leak in \`myservice\` that gradually led to resource exhaustion.
- **Effect:** This led to elevated latency and increased error rates at the
\`/api/submit\` endpoint, impacting downstream services like
\`notification-service\` that rely on responses from \`myservice\`.

---

## 4. Evidence for Root Cause

Present a structured section summarizing all the evidence that supports the
identified root cause. If no root cause is identified, outline the most
significant findings that guided or limited the investigation.

- **Log Patterns:** Describe any abnormal log patterns observed, including
notable change points.
- **Alerts and SLOs:** Mention any alerts or breached SLOs that were triggered,
including their relevance to the investigation.
- **Data Analysis:** Include any data trends or patterns that were analyzed
(e.g., resource usage spikes, network traffic).

#### Example:
- **Memory Usage:** Logs showed a steady increase in memory consumption starting
at 10:00 AM, peaking at 12:00 PM, where memory usage surpassed 90%, triggering
the alert.
- **Error Rate Logs:** Error rates for \`/api/submit\` began increasing around
11:30 AM, correlating with the memory pressure in \`myservice\`.
- **API Logs:** \`myotherservice\` API logs showed no internal errors, ruling out
an upstream dependency as the primary cause.

---

## 5. Proposed Impact

Even if the root cause is clear, it is important to mention the impact of the
issue on the system, users, and business operations. This includes:
- **Affected Services:** Identify the services impacted (e.g., downstream
dependencies).
- **Performance Degradation:** Describe any SLO breaches or performance
bottlenecks.
- **User Impact:** Explain how users or clients were affected (e.g., higher
latency, failed transactions).

#### Example:
- **Impact:** The memory leak in \`myservice\` caused service degradation over a
2-hour window. This affected \`/api/submit\`, causing delays and failed
requests, ultimately impacting user-facing services relying on that endpoint.

---

## 6. Timeline of Significant Events

${RCA_PROMPT_TIMELINE_GUIDE}

---

## 7. Conclusion and Next Steps

Summarize the conclusions of the investigation:
- If a root cause was identified, confirm it with the strongest supporting
evidence.
- If no root cause was found, state that clearly and suggest areas for further
investigation or monitoring.

Finally, outline the next steps:
- **Fixes or Mitigations:** Recommend any immediate actions (e.g., patch
deployment, configuration changes).
- **Monitoring Improvements:** Suggest new alerts or monitoring metrics based on
lessons learned.
- **Further Investigations:** If necessary, propose any follow-up investigations
to gather more evidence.

#### Example:
- **Conclusion:** The root cause of the incident was a memory leak in
\`myservice\`, leading to resource exhaustion and elevated error rates at
\`/api/submit\`. The leak has been patched, and monitoring has been improved to
detect memory spikes earlier.
- **Next Steps:** Monitor memory usage for the next 24 hours to ensure no
recurrence. Investigate adding a memory ceiling for \`myservice\` to prevent
future resource exhaustion.`;

export async function writeFinalReport({
  rcaContext,
}: {
  rcaContext: RootCauseAnalysisContext;
}): Promise<string> {
  const { inferenceClient, connectorId } = rcaContext;

  return await inferenceClient
    .output({
      id: 'write_final_report',
      connectorId,
      system: `${RCA_SYSTEM_PROMPT_BASE}
        
        ${SYSTEM_PROMPT_ADDENDUM}`,
      input: `Write the RCA report, based on the observations.
        
        ${stringifySummaries(rcaContext)}`,
    })
    .then((event) => event.content);
}
