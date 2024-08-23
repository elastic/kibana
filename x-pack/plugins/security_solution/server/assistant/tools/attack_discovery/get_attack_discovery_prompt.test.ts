/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getAttackDiscoveryPrompt } from './get_attack_discovery_prompt';

describe('getAttackDiscoveryPrompt', () => {
  it('should generate the correct attack discovery prompt', () => {
    const anonymizedAlerts = ['Alert 1', 'Alert 2', 'Alert 3'];

    const expected = `You are a cyber security analyst tasked with analyzing security events from Elastic Security to identify and report on potential cyber attacks or progressions. Your report should focus on high-risk incidents that could severely impact the organization, rather than isolated alerts. Present your findings in a way that can be easily understood by anyone, regardless of their technical expertise, as if you were briefing the CISO. Break down your response into sections based on timing, hosts, and users involved. When correlating alerts, use kibana.alert.original_time when it's available, otherwise use @timestamp. Include appropriate context about the affected hosts and users. Describe how the attack progression might have occurred and, if feasible, attribute it to known threat groups. Prioritize high and critical alerts, but include lower-severity alerts if desired. In the description field, provide as much detail as possible, in a bulleted list explaining any attack progressions. Accuracy is of utmost importance. Escape backslashes to respect JSON validation. New lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON. Only return JSON output, as described above. Do not add any additional text to describe your output.

Use context from the following open and acknowledged alerts to provide insights:

"""
Alert 1

Alert 2

Alert 3
"""
`;

    const prompt = getAttackDiscoveryPrompt({ anonymizedAlerts });

    expect(prompt).toEqual(expected);
  });
});
