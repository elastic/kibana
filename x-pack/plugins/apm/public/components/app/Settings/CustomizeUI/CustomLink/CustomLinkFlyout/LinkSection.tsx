/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CustomLink } from '../../../../../../../common/custom_link/custom_link_types';
import { Documentation } from './Documentation';

interface InputField {
  name: keyof CustomLink;
  label: string;
  helpText: string | React.ReactNode;
  placeholder: string;
  onChange: (value: string) => void;
  value?: string;
}

interface Props {
  label?: string;
  onChangeLabel: (label: string) => void;
  url?: string;
  onChangeUrl: (url: string) => void;
}

export const LinkSection = ({
  label,
  onChangeLabel,
  url,
  onChangeUrl,
}: Props) => {
  const inputFields: InputField[] = [
    {
      name: 'label',
      label: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.flyout.link.label',
        {
          defaultMessage: 'Label',
        }
      ),
      helpText: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.flyout.link.label.helpText',
        {
          defaultMessage:
            'This is the label shown in the actions context menu. Keep it as short as possible.',
        }
      ),
      placeholder: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.flyout.link.label.placeholder',
        {
          defaultMessage: 'e.g. Support tickets',
        }
      ),
      value: label,
      onChange: onChangeLabel,
    },
    {
      name: 'url',
      label: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.flyout.link.url',
        {
          defaultMessage: 'URL',
        }
      ),
      helpText: (
        <>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.flyout.link.url.helpText',
            {
              defaultMessage:
                'Add field name variables to your URL to apply values e.g. {sample}.',
              values: { sample: '{{trace.id}}' },
            }
          )}{' '}
          <Documentation
            label={i18n.translate(
              'xpack.apm.settings.customizeUI.customLink.flyout.link.url.doc',
              {
                defaultMessage: 'Learn more in the docs.',
              }
            )}
          />
        </>
      ),
      placeholder: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.flyout.link.url.placeholder',
        {
          defaultMessage: 'e.g. https://www.elastic.co/',
        }
      ),
      value: url,
      onChange: onChangeUrl,
    },
  ];

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.flyout.action.title',
            {
              defaultMessage: 'Link',
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="l" />
      {inputFields.map((field) => {
        return (
          <EuiFormRow
            fullWidth
            key={field.name}
            label={field.label}
            helpText={field.helpText}
            labelAppend={
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customLink.flyout.required',
                  {
                    defaultMessage: 'Required',
                  }
                )}
              </EuiText>
            }
          >
            <EuiFieldText
              placeholder={field.placeholder}
              name={field.name}
              fullWidth
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              data-test-subj={field.name}
            />
          </EuiFormRow>
        );
      })}
    </>
  );
};
