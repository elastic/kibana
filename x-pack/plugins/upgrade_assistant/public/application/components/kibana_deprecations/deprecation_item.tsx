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
  EuiButtonEmpty,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DomainDeprecationDetails } from 'kibana/public';
import { DeprecationHealth } from '../shared';
import { LEVEL_MAP } from '../constants';
import { StepsModalContent } from './steps_modal';

const i18nTexts = {
  getDeprecationTitle: (domainId: string) => {
    return i18n.translate('xpack.upgradeAssistant.deprecationGroupItemTitle', {
      defaultMessage: "'{domainId}' is using a deprecated feature",
      values: {
        domainId,
      },
    });
  },
  docLinkText: i18n.translate('xpack.upgradeAssistant.deprecationGroupItem.docLinkText', {
    defaultMessage: 'View documentation',
  }),
  manualFixButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.deprecationGroupItem.fixButtonLabel',
    {
      defaultMessage: 'Show steps to fix',
    }
  ),
  resolveButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.deprecationGroupItem.resolveButtonLabel',
    {
      defaultMessage: 'Quick resolve',
    }
  ),
};

export interface Props {
  deprecation: DomainDeprecationDetails;
  index: number;
  forceExpand: boolean;
  showStepsModal: (modalContent: StepsModalContent) => void;
  showResolveModal: (deprecation: DomainDeprecationDetails) => void;
}

export const KibanaDeprecationAccordion: FunctionComponent<Props> = ({
  deprecation,
  forceExpand,
  index,
  showStepsModal,
  showResolveModal,
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

                {(documentationUrl || correctiveActions?.manualSteps) && (
                  <EuiFlexGroup>
                    {correctiveActions?.api && (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          fill
                          size="s"
                          data-test-subj="resolveButton"
                          onClick={() => showResolveModal(deprecation)}
                        >
                          {i18nTexts.resolveButtonLabel}
                        </EuiButton>
                      </EuiFlexItem>
                    )}

                    {correctiveActions?.manualSteps && (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          size="s"
                          data-test-subj="stepsButton"
                          onClick={() =>
                            showStepsModal({
                              domainId,
                              steps: correctiveActions.manualSteps!,
                              documentationUrl,
                            })
                          }
                        >
                          {i18nTexts.manualFixButtonLabel}
                        </EuiButton>
                      </EuiFlexItem>
                    )}

                    {documentationUrl && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          href={documentationUrl}
                          iconType="help"
                          target="_blank"
                        >
                          {i18nTexts.docLinkText}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                )}
              </>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
