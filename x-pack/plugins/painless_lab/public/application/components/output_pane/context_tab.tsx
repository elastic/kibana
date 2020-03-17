/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  EuiText,
  EuiSuperSelect,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { CodeEditor } from '../../../../../../../src/plugins/kibana_react/public';
import { painlessContextOptions } from '../../common/constants';

interface Props {
  context: any;
  index: string;
  document: string;
  onContextChange: (context: string) => void;
  onIndexChange: (index: string) => void;
  onDocumentChange: (document: string) => void;
}

export const ContextTab = ({
  context,
  index,
  document,
  onContextChange,
  onIndexChange,
  onDocumentChange,
}: Props) => (
  <>
    <EuiSpacer size="m" />
    <EuiFormRow
      label={
        <EuiToolTip
          content={i18n.translate('xpack.painlessLab.contextFieldTooltipText', {
            defaultMessage: 'Different contexts provide different functions on the ctx object',
          })}
        >
          <span>
            <FormattedMessage
              id="xpack.painlessLab.contextFieldLabel"
              defaultMessage="Execution context"
            />{' '}
            <EuiIcon type="questionInCircle" color="subdued" />
          </span>
        </EuiToolTip>
      }
      labelAppend={
        <EuiText size="xs">
          <EuiLink
            href="https://www.elastic.co/guide/en/elasticsearch/painless/current/painless-execute-api.html"
            target="_blank"
          >
            {i18n.translate('xpack.painlessLab.contextFieldDocLinkText', {
              defaultMessage: 'Context docs',
            })}
          </EuiLink>
        </EuiText>
      }
      fullWidth
    >
      <EuiSuperSelect
        options={painlessContextOptions}
        valueOfSelected={context}
        onChange={onContextChange}
        itemLayoutAlign="top"
        hasDividers
        fullWidth
      />
    </EuiFormRow>

    {['filter', 'score'].indexOf(context) !== -1 && (
      <EuiFormRow
        label={
          <EuiToolTip
            content={i18n.translate('xpack.painlessLab.indexFieldTooltipText', {
              defaultMessage: "Index mappings must be compatible with the sample document's fields",
            })}
          >
            <span>
              <FormattedMessage id="xpack.painlessLab.indexFieldLabel" defaultMessage="Index" />{' '}
              <EuiIcon type="questionInCircle" color="subdued" />
            </span>
          </EuiToolTip>
        }
        fullWidth
      >
        <EuiFieldText fullWidth value={index || ''} onChange={e => onIndexChange(e.target.value)} />
      </EuiFormRow>
    )}
    {['filter', 'score'].indexOf(context) !== -1 && (
      <EuiFormRow
        label={
          <EuiToolTip
            content={i18n.translate('xpack.painlessLab.documentFieldTooltipText', {
              defaultMessage: "Your script can access this document's fields",
            })}
          >
            <span>
              <FormattedMessage
                id="xpack.painlessLab.documentFieldLabel"
                defaultMessage="Sample document"
              />{' '}
              <EuiIcon type="questionInCircle" color="subdued" />
            </span>
          </EuiToolTip>
        }
        fullWidth
      >
        <EuiPanel paddingSize="s">
          <CodeEditor
            languageId="json"
            height={400}
            value={document}
            onChange={onDocumentChange}
            options={{
              fontSize: 12,
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              automaticLayout: true,
            }}
          />
        </EuiPanel>
      </EuiFormRow>
    )}
  </>
);
