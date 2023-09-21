/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Markdown } from '@kbn/kibana-react-plugin/public';

import { useKibana } from '../../../../common/lib/kibana';

const POPOVER_WIDTH = 640;

/**
 * Icon and popover that gives hint to users how to get started with ES|QL rules
 */
const EsqlInfoIconComponent = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { docLinks } = useKibana().services;

  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonIcon iconType="iInCircle" onClick={onButtonClick} aria-label="Open help popover" />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <Markdown
          markdown={i18n.translate(
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

More information can be found on {startUsingEsqlLink}
            `,
              values: {
                statsByLink: `[STATS..BY](${docLinks.links.esql.statsBy})`,
                startUsingEsqlLink: `[WIP: Get started using ES|QL rules](${docLinks.links.esql.statsBy})`,
              },
            }
          )}
        />
      </EuiText>
    </EuiPopover>
  );
};

export const EsqlInfoIcon = React.memo(EsqlInfoIconComponent);

EsqlInfoIcon.displayName = 'EsqlInfoIcon';
