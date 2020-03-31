/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiLink,
  EuiAccordion,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { UrlTemplate } from '../../types';
import { LegacyIcon } from '../legacy_icon';
import { outlinkEncoders } from '../../helpers/outlink_encoders';
import { urlTemplateIconChoices } from '../../helpers/style_choices';
import { isUrlTemplateValid, isKibanaUrl, replaceKibanaUrlParam } from '../../helpers/url_template';
import { isEqual } from '../helpers';

export interface NewFormProps {
  onSubmit: (template: UrlTemplate) => void;
  onRemove: () => void;
  id: string;
}

export interface UpdateFormProps {
  onSubmit: (template: UrlTemplate) => void;
  initialTemplate: UrlTemplate;
  onRemove: () => void;
  id: string;
}

export type UrlTemplateFormProps = NewFormProps | UpdateFormProps;

function isUpdateForm(props: UrlTemplateFormProps): props is UpdateFormProps {
  return 'initialTemplate' in props;
}

export function UrlTemplateForm(props: UrlTemplateFormProps) {
  const { onSubmit } = props;
  const getInitialTemplate = () =>
    isUpdateForm(props)
      ? props.initialTemplate
      : {
          encoder: outlinkEncoders[0],
          icon: null,
          description: '',
          url: '',
        };

  const [currentTemplate, setCurrentTemplate] = useState(getInitialTemplate);

  const persistedTemplateState = isUpdateForm(props) && props.initialTemplate;

  // reset local form if template passed in from parent component changes
  useEffect(() => {
    if (isUpdateForm(props) && currentTemplate !== props.initialTemplate) {
      setCurrentTemplate(props.initialTemplate);
    }
    // this hook only updates on change of the prop
    // it's meant to reset the internal state on changes outside of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedTemplateState]);

  const [touched, setTouched] = useState({
    description: false,
    url: false,
  });

  const [open, setOpen] = useState(!isUpdateForm(props));

  const [autoformatUrl, setAutoformatUrl] = useState(false);

  function setValue<K extends keyof UrlTemplate>(key: K, value: UrlTemplate[K]) {
    setCurrentTemplate({ ...currentTemplate, [key]: value });
  }

  function reset() {
    setTouched({
      description: false,
      url: false,
    });
    setCurrentTemplate(getInitialTemplate());
    setAutoformatUrl(false);
  }

  function convertUrl() {
    setCurrentTemplate({
      ...currentTemplate,
      url: replaceKibanaUrlParam(currentTemplate.url),
      // reset to kql encoder
      encoder:
        currentTemplate.encoder.type === 'kql'
          ? currentTemplate.encoder
          : outlinkEncoders.find(enc => enc.type === 'kql')!,
    });
    setAutoformatUrl(false);
  }

  const urlPlaceholderMissing = Boolean(
    currentTemplate.url && !isUrlTemplateValid(currentTemplate.url)
  );
  const formIncomplete = !Boolean(currentTemplate.description && currentTemplate.url);

  const formUntouched = isEqual(currentTemplate, getInitialTemplate());

  return (
    <EuiAccordion
      id={props.id}
      initialIsOpen={!isUpdateForm(props)}
      buttonContent={
        isUpdateForm(props)
          ? props.initialTemplate.description
          : i18n.translate('xpack.graph.templates.addLabel', {
              defaultMessage: 'New drilldown',
            })
      }
      extraAction={
        isUpdateForm(props) &&
        props.initialTemplate.icon && <LegacyIcon asListIcon icon={props.initialTemplate.icon} />
      }
      className={classNames('gphUrlTemplateList__accordion', {
        'gphUrlTemplateList__accordion--isOpen': open,
      })}
      buttonClassName="gphUrlTemplateList__accordionbutton"
      onToggle={isOpen => {
        setOpen(isOpen);
      }}
      paddingSize="m"
    >
      <form
        onSubmit={e => {
          e.preventDefault();
          onSubmit(currentTemplate);
          if (!isUpdateForm(props)) {
            reset();
          }
        }}
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.graph.settings.drillDowns.urlDescriptionInputLabel', {
            defaultMessage: 'Title',
          })}
          isInvalid={touched.description && !currentTemplate.description}
          onBlur={() => setTouched({ ...touched, description: true })}
        >
          <EuiFieldText
            fullWidth
            value={currentTemplate.description}
            isInvalid={touched.description && !currentTemplate.description}
            onChange={e => setValue('description', e.target.value)}
            placeholder={i18n.translate(
              'xpack.graph.settings.drillDowns.urlDescriptionInputPlaceholder',
              { defaultMessage: 'Search on Google' }
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.graph.settings.drillDowns.urlInputLabel', {
            defaultMessage: 'URL',
          })}
          helpText={
            <>
              {autoformatUrl && (
                <p>
                  <strong>
                    {i18n.translate('xpack.graph.settings.drillDowns.kibanaUrlWarningText', {
                      defaultMessage: 'Possible Kibana URL pasted, ',
                    })}
                    <EuiLink onClick={convertUrl}>
                      <strong>
                        {i18n.translate(
                          'xpack.graph.settings.drillDowns.kibanaUrlWarningConvertOptionLinkText',
                          { defaultMessage: 'convert it.' }
                        )}
                      </strong>
                    </EuiLink>
                  </strong>
                </p>
              )}
              {i18n.translate('xpack.graph.settings.drillDowns.urlInputHelpText', {
                defaultMessage:
                  'Define template URLs using {gquery} where the selected vertex terms are inserted.',
                values: { gquery: '{{gquery}}' },
              })}
            </>
          }
          onBlur={() => setTouched({ ...touched, url: true })}
          isInvalid={urlPlaceholderMissing || (touched.url && !currentTemplate.url)}
          error={
            urlPlaceholderMissing
              ? [
                  i18n.translate('xpack.graph.settings.drillDowns.invalidUrlWarningText', {
                    defaultMessage: 'The URL must contain a {placeholder} string.',
                    values: { placeholder: '{{gquery}}' },
                  }),
                ]
              : []
          }
        >
          <EuiFieldText
            fullWidth
            placeholder="https://www.google.co.uk/#q={{gquery}}"
            value={currentTemplate.url}
            onChange={e => {
              setValue('url', e.target.value);
              setAutoformatUrl(false);
            }}
            onPaste={e => {
              e.preventDefault();
              const pastedUrl = e.clipboardData.getData('text/plain');
              if (isKibanaUrl(pastedUrl)) {
                setAutoformatUrl(true);
              }
              setValue('url', pastedUrl);
            }}
            isInvalid={urlPlaceholderMissing || (touched.url && !currentTemplate.url)}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          helpText={currentTemplate.encoder.description}
          label={i18n.translate('xpack.graph.settings.drillDowns.urlEncoderInputLabel', {
            defaultMessage: 'URL parameter type',
          })}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            options={outlinkEncoders.map(encoder => ({ label: encoder.title, value: encoder }))}
            selectedOptions={[
              {
                label: currentTemplate.encoder.title,
                value: currentTemplate.encoder,
              },
            ]}
            onChange={choices => {
              // choices[0].value can't be null because `isClearable` is set to false above
              setValue('encoder', choices[0].value!);
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.graph.settings.drillDowns.toolbarIconPickerLabel', {
            defaultMessage: 'Toolbar icon',
          })}
        >
          <div role="listbox">
            {urlTemplateIconChoices.map(icon => (
              <LegacyIcon
                key={icon.class}
                selected={icon === currentTemplate.icon}
                icon={icon}
                onClick={() => {
                  if (currentTemplate.icon === icon) {
                    setValue('icon', null);
                  } else {
                    setValue('icon', icon);
                  }
                }}
              />
            ))}
          </div>
        </EuiFormRow>
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            {
              <EuiButtonEmpty
                color="danger"
                onClick={() => {
                  props.onRemove();
                }}
                data-test-subj="graphRemoveUrlTemplate"
              >
                {isUpdateForm(props)
                  ? i18n.translate('xpack.graph.settings.drillDowns.removeButtonLabel', {
                      defaultMessage: 'Remove',
                    })
                  : i18n.translate('xpack.graph.settings.drillDowns.cancelButtonLabel', {
                      defaultMessage: 'Cancel',
                    })}
              </EuiButtonEmpty>
            }
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={reset} disabled={formUntouched}>
              {i18n.translate('xpack.graph.settings.drillDowns.resetButtonLabel', {
                defaultMessage: 'Reset',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton type="submit" fill isDisabled={urlPlaceholderMissing || formIncomplete}>
              {isUpdateForm(props)
                ? i18n.translate('xpack.graph.settings.drillDowns.updateSaveButtonLabel', {
                    defaultMessage: 'Update drilldown',
                  })
                : i18n.translate('xpack.graph.settings.drillDowns.newSaveButtonLabel', {
                    defaultMessage: 'Save drilldown',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </form>
    </EuiAccordion>
  );
}
