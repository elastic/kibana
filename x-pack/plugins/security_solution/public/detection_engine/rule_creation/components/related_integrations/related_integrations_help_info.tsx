/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiLink, EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';

const POPOVER_WIDTH = 320;

export function RelatedIntegrationsHelpInfo(): JSX.Element {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { docLinks } = useKibana().services;

  const onButtonClick = useCallback(() => setIsPopoverOpen((x) => !x), [setIsPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  const button = (
    <EuiButtonIcon
      iconType="questionInCircle"
      onClick={onButtonClick}
      aria-label="Open help popover"
    />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.fieldRelatedIntegrationsHelpText"
          defaultMessage="Choose which {integrationsDocLink} this rule depends on. Using integrations is the best way to add data to the Elastic Stack. Pick an integration from the list and correct the version dependency if necessary. Version dependency represents {semverLink}. Only tilde, caret and plain versions are supported e.g. ~1.2.3, ^1.2.3 or 1.2.3."
          values={{
            integrationsDocLink: (
              <EuiLink href={docLinks.links.addData} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.integrationsLink"
                  defaultMessage="integrations"
                />
              </EuiLink>
            ),
            semverLink: (
              <EuiLink href="https://semver.org/" target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.semanticVersionLink"
                  defaultMessage="a semantic version"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
