/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDefaultPromptTemplate =
  () => `Evaluate based on how well the following submission follows the specified rubric. Grade only based on the rubric and "expected response":

[BEGIN rubric]
1. Is the submission non-empty and not null?
2. Is the submission well-formed JSON?
3. Evaluate the value of the "date_format" field of all the "mapping" fields in the submission json. Does the "date_format" field contain a valid java date format?
4. Evaluate the fields that are mapped to 'null' in all the "mapping" fields in the submission json. Interpret if any of those fields can be mapped to a valid Elastic Common Schema field.
[END rubric]

[BEGIN DATA]
{input}
[BEGIN submission]
{output}
[END submission]
[BEGIN expected response]
{reference}
[END expected response]
[END DATA]

{criteria} Base your answer based on all the grading rubric items. If at least 3 of the 4 rubric items are correct, consider the submission correct. Write out your explanation for each criterion in the rubric, first in detail, then as a separate summary on a new line.

Then finally respond with a single character, 'Y' or 'N', on a new line without any preceding or following characters. It's important that only a single character appears on the last line.`;
