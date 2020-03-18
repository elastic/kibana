/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
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
import { useAppContext } from '../../context';

export const ContextTab: FunctionComponent = () => {
  const { state, updateState } = useAppContext();
  const { context, document, index, query } = state;

  return (
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
          onChange={nextContext => updateState(() => ({ context: nextContext }))}
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
                defaultMessage:
                  "Index mappings must be compatible with the sample document's fields",
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
          <EuiFieldText
            fullWidth
            value={index || ''}
            onChange={e => {
              const nextIndex = e.target.value;
              updateState(() => ({ index: nextIndex }));
            }}
          />
        </EuiFormRow>
      )}
      {/* Query DSL Code Editor */}
      {'score'.indexOf(context) !== -1 && (
        <EuiFormRow
          label={
            <EuiToolTip
              content={i18n.translate('xpack.painlessLab.queryFieldLabel', {
                defaultMessage:
                  'Use query to specify that that _score will be used to calculate score.',
              })}
            >
              <span>
                <FormattedMessage id="xpack.painlessLab.indexFieldLabel" defaultMessage="Query" />{' '}
                <EuiIcon type="questionInCircle" color="subdued" />
              </span>
            </EuiToolTip>
          }
          labelAppend={
            <EuiText size="xs">
              <EuiLink
                href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html"
                target="_blank"
              >
                {i18n.translate('xpack.painlessLab.queryFieldDocLinkText', {
                  defaultMessage: 'Query DSL docs',
                })}
              </EuiLink>
            </EuiText>
          }
          fullWidth
        >
          <EuiPanel paddingSize="s">
            <CodeEditor
              languageId="json"
              height={150}
              value={query}
              onChange={nextQuery => updateState(() => ({ query: nextQuery }))}
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
              onChange={nextDocument => updateState(() => ({ document: nextDocument }))}
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
};
