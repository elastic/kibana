/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DomainDeprecationDetails } from 'src/core/server/types';
import { DeprecationHealth } from '../shared';
import { LEVEL_MAP } from '../constants';
import { FlyoutContent } from './steps_flyout';

const i18nTexts = {
  getDeprecationTitle: (domainId: string) => {
    return i18n.translate('xpack.upgradeAssistant.deprecationGroupItemTitle', {
      defaultMessage: `"${domainId}" is using a deprecated feature`,
    });
  },
  docLinkText: i18n.translate('xpack.upgradeAssistant.deprecationGroupItem.docLinkText', {
    defaultMessage: 'Documentation',
  }),
  fixButtonLabel: i18n.translate('xpack.upgradeAssistant.deprecationGroupItem.fixButtonLabel', {
    defaultMessage: 'Fix',
  }),
};

export interface Props {
  deprecation: DomainDeprecationDetails;
  index: number;
  forceExpand: boolean;
  showFlyout: (flyoutContent: FlyoutContent) => void;
}

/**
 * A single accordion item for a grouped deprecation item.
 */
export const KibanaDeprecationAccordion: FunctionComponent<Props> = ({
  deprecation,
  forceExpand,
  index,
  showFlyout,
}) => {
  const { domainId, level, message, documentationUrl, correctiveActions } = deprecation;

  return (
    <EuiAccordion
      id={`${domainId}-${index}`}
      data-test-subj={`${domainId}Deprecation`}
      initialIsOpen={forceExpand}
      buttonContent={i18nTexts.getDeprecationTitle(domainId)}
      paddingSize="m"
      extraAction={<DeprecationHealth single deprecationLevels={[LEVEL_MAP[level]]} />}
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText size="s">
            {level === 'fetch_error' ? (
              <EuiCallOut
                title={message}
                color="warning"
                iconType="alert"
                data-test-subj={`${domainId}Error`}
                size="s"
              />
            ) : (
              <>
                <p>{message}</p>
                {documentationUrl && (
                  <p>
                    <EuiLink href={documentationUrl} external>
                      {i18nTexts.docLinkText}
                    </EuiLink>
                  </p>
                )}
              </>
            )}
          </EuiText>
        </EuiFlexItem>

        {correctiveActions?.manualSteps && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => showFlyout({ domainId, steps: correctiveActions.manualSteps! })}
            >
              {i18nTexts.fixButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
