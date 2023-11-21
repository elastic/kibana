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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { PagerDutyActionParams } from '../types';

type LinksListProps = Pick<
  ActionParamsProps<PagerDutyActionParams>,
  'index' | 'editAction' | 'errors'
> &
  Pick<PagerDutyActionParams, 'links'>;

export const LinksList: React.FC<LinksListProps> = ({ editAction, errors, index, links }) => {
  const areLinksInvalid = errors.links !== undefined && errors.links.length > 0;

  return (
    <EuiFormRow
      id="pagerDutyLinks"
      label={i18n.translate('xpack.stackConnectors.components.pagerDuty.linksFieldLabel', {
        defaultMessage: 'Links (optional)',
      })}
      isInvalid={areLinksInvalid}
      error={errors.links}
      fullWidth
    >
      <EuiFlexGroup direction="column">
        {links && (
          <EuiFlexItem>
            {links.map((link, idx) => (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup key={`my-key-${idx}`}>
                  <EuiFlexItem>
                    <EuiFormRow label="href">
                      <EuiFieldText
                        name="href"
                        value={link.href}
                        onChange={(e) => {
                          const newLinks = links ? [...links] : [];
                          newLinks[idx] = { ...link, href: e.target.value };
                          editAction('links', newLinks, index);
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label="text" isInvalid={link.text.length === 0}>
                      <EuiFieldText
                        name="text"
                        value={link.text}
                        onChange={(e) => {
                          const newLinks = links ? [...links] : [];
                          newLinks[idx] = { ...link, text: e.target.value };
                          editAction('links', newLinks, index);
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      color="danger"
                      onClick={() => editAction('links', links.splice(idx), index)}
                      iconType="minusInCircle"
                      style={{ marginTop: '28px' }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ))}
          </EuiFlexItem>
        )}
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
              {'Add Link'}
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
