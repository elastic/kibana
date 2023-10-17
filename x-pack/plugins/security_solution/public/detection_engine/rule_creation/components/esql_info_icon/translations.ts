/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.esqlInfoAriaLabel',
  {
    defaultMessage: `Open help popover`,
  }
);

export const getTooltipContent = (statsByLink: string, startUsingEsqlLink: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.esqlInfoTooltipContent',
    {
      defaultMessage: `
### Aggregating rule
Is a rule that uses {statsByLink} grouping commands. So, its result can not be matched with a particular document in ES.
\`\`\`
FROM logs*
| STATS count = COUNT(host.name) BY host.name
| SORT host.name
\`\`\`


### Non-aggregating rule
Is a rule that does not use {statsByLink} grouping commands. Hence, each row in result can be tracked to a source document in ES. For this type of rule,
please use operator \`[metadata _id, _index, _version]\` after defining index source. This would allow deduplicate alerts and link them with the source document.

Example

\`\`\`
FROM logs* [metadata _id, _index, _version]
| WHERE event.id == "test"
| LIMIT 10
\`\`\`

Please, ensure, metadata properties \`id\`, \`_index\`, \`_version\` are carried over through pipe operators.
    `,
      values: {
        statsByLink: `[STATS..BY](${statsByLink})`,
        // Docs team will provide actual link to a new page before release
        //  startUsingEsqlLink: `[WIP: Get started using ES|QL rules](${startUsingEsqlLink})`,
      },
    }
  );
