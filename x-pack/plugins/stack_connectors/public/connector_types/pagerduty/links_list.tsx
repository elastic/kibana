/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionParamsProps,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { PagerDutyActionParams } from '../types';
import { OPTIONAL_LABEL } from './translations';

type LinksListProps = Pick<
  ActionParamsProps<PagerDutyActionParams>,
  'index' | 'editAction' | 'errors' | 'messageVariables'
> &
  Pick<PagerDutyActionParams, 'links'>;

export const LinksList: React.FC<LinksListProps> = ({
  editAction,
  errors,
  index,
  links,
  messageVariables,
}) => {
  const areLinksInvalid = Array.isArray(errors.links) && errors.links.length > 0;

  return (
    <EuiFormRow
      id="pagerDutyLinks"
      label={i18n.translate('xpack.stackConnectors.components.pagerDuty.linksFieldLabel', {
        defaultMessage: 'Links',
      })}
      labelAppend={
        <EuiText size="xs" color="subdued">
          {OPTIONAL_LABEL}
        </EuiText>
      }
      isInvalid={areLinksInvalid}
      error={errors.links}
      fullWidth
    >
      <EuiFlexGroup direction="column" data-test-subj="linksList" gutterSize="s">
        {links &&
          links.map((link, currentLinkIndex) => (
            <EuiFlexItem data-test-subj={`linksListItemRow-${currentLinkIndex}`}>
              <EuiSpacer size="s" />
              <EuiFlexGroup key={`linksListItemRow-${currentLinkIndex}`}>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.stackConnectors.components.pagerDuty.linkURLFieldLabel',
                      {
                        defaultMessage: 'URL',
                      }
                    )}
                    fullWidth
                  >
                    <TextFieldWithMessageVariables
                      index={index}
                      editAction={(key, value, actionIndex) => {
                        const newLinks = [...links];
                        newLinks[currentLinkIndex] = { text: link.text, href: value };
                        editAction('links', newLinks, actionIndex);
                      }}
                      messageVariables={messageVariables}
                      paramsProperty={'linksHref'}
                      inputTargetValue={link.href}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.stackConnectors.components.pagerDuty.linkTextFieldLabel',
                      {
                        defaultMessage: 'Label',
                      }
                    )}
                    fullWidth
                  >
                    <TextFieldWithMessageVariables
                      index={index}
                      editAction={(key, value, actionIndex) => {
                        const newLinks = [...links];
                        newLinks[currentLinkIndex] = { href: link.href, text: value };
                        editAction('links', newLinks, actionIndex);
                      }}
                      messageVariables={messageVariables}
                      paramsProperty={'linksText'}
                      inputTargetValue={link.text}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="danger"
                    onClick={() => {
                      links.splice(currentLinkIndex, 1);
                      editAction('links', links, index);
                    }}
                    iconType="minusInCircle"
                    css={{ marginTop: 28 }}
                    data-test-subj="pagerDutyRemoveLinkButton"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        <EuiFlexItem>
          <div>
            <EuiButton
              iconType="plusInCircle"
              onClick={() =>
                editAction(
                  'links',
                  links ? [...links, { href: '', text: '' }] : [{ href: '', text: '' }],
                  index
                )
              }
              data-test-subj="pagerDutyAddLinkButton"
            >
              {i18n.translate('xpack.stackConnectors.components.pagerDuty.addLinkButtonLabel', {
                defaultMessage: 'Add Link',
              })}
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
