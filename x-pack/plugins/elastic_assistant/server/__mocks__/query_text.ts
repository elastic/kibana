/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This mock query text is an example of a prompt that might be passed to
 * the `ElasticSearchStore`'s `similaritySearch` function, as the `query`
 * parameter.
 *
 * In the real world, an LLM extracted the `mockQueryText` from the
 * following prompt, which includes a system prompt:
 *
 * ```
 * You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.
 * If you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.
 *
 * Use the following context to answer questions:
 *
 * Generate an ES|QL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called "follow_up" that contains a value of "true", otherwise, it should contain "false". The user names should also be enriched with their respective group names.
 * ```
 *
 * In the example above, the LLM omitted the system prompt, such that only `mockQueryText` is passed to the `similaritySearch` function.
 */
export const mockQueryText =
  'Generate an ES|QL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called follow_up that contains a value of true, otherwise, it should contain false. The user names should also be enriched with their respective group names.';
