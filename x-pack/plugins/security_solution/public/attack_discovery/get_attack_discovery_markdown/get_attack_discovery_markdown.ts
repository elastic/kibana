/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';

import { getTacticLabel, getTacticMetadata } from '../helpers';

export const getMarkdownFields = (markdown: string): string => {
  const regex = new RegExp('{{\\s*(\\S+)\\s+(\\S+)\\s*}}', 'gm');

  return markdown.replace(regex, (_, field, value) => `\`${value}\``);
};

export const getAttackChainMarkdown = (attackDiscovery: AttackDiscovery): string => {
  const tacticMetadata = getTacticMetadata(attackDiscovery).filter((tactic) => tactic.detected);

  if (tacticMetadata.length === 0) {
    return '';
  }

  const markdownList = tacticMetadata
    .map((tactic) => `- ${getTacticLabel(tactic.name)}`)
    .join('\n');

  return `### Attack Chain
${markdownList}
`;
};

export const getMarkdownWithOriginalValues = ({
  markdown,
  replacements,
}: {
  markdown: string;
  replacements?: Replacements;
}): string => {
  if (replacements == null) {
    return markdown;
  }

  return Object.keys(replacements).reduce<string>(
    (acc, uuid) => acc.replaceAll(uuid, replacements[uuid]),
    markdown
  );
};

export const getAttackDiscoveryMarkdown = ({
  attackDiscovery,
  replacements,
}: {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}): string => {
  const title = getMarkdownFields(attackDiscovery.title);
  const entitySummaryMarkdown = getMarkdownFields(attackDiscovery.entitySummaryMarkdown);
  const summaryMarkdown = getMarkdownFields(attackDiscovery.summaryMarkdown);
  const detailsMarkdown = getMarkdownFields(attackDiscovery.detailsMarkdown);

  const markdown = `## ${title}

${entitySummaryMarkdown}

### Summary
${summaryMarkdown}

### Details
${detailsMarkdown}

${getAttackChainMarkdown(attackDiscovery)}
`;
  if (replacements != null) {
    return getMarkdownWithOriginalValues({ markdown, replacements });
  } else {
    return markdown;
  }
};
