/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getConflictingAntivirusPrompt = ({
  anonymizedValues,
}: {
  anonymizedValues: string[];
}) => {
  return `You are an Elastic Security user tasked with analyzing process events from Elastic Security to identify antivirus processes. Only focus on detecting antivirus processes including those that are included by default in operating systems such as Microsoft Defender. Ignore processes that belong to Elastic Defend, that are not antivirus processes, or are typical processes built into the operating system. Accuracy is of the utmost importance, try to minimize false positives. Group the processes by the antivirus program, outputting the name of the program in metadata.program. Escape backslashes to respect JSON validation. New lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON. Only return JSON output, as described above. Do not add any additional text to describe your output.

  Use context from the following process events to provide insights:
  """
  ${anonymizedValues.join('\n\n')}
  """
  `;
};
