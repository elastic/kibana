/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Filter } from '../../../../../../common/custom_link/custom_link_types';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { FiltersSection } from './filters_section';
import { FlyoutFooter } from './flyout_footer';
import { LinkSection } from './link_section';
import { saveCustomLink } from './save_custom_link';
import { LinkPreview } from './link_preview';
import { Documentation } from './documentation';

interface Props {
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  defaults?: {
    url?: string;
    label?: string;
    filters?: Filter[];
  };
  customLinkId?: string;
}

const filtersEmptyState: Filter[] = [{ key: '', value: '' }];

export function CreateEditCustomLinkFlyout({
  onClose,
  onSave,
  onDelete,
  defaults,
  customLinkId,
}: Props) {
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  const [label, setLabel] = useState(defaults?.label || '');
  const [url, setUrl] = useState(defaults?.url || '');
  const [filters, setFilters] = useState(
    defaults?.filters?.length ? defaults.filters : filtersEmptyState
  );

  const isFormValid = !!label && !!url;

  const onSubmit = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);
    await saveCustomLink({
      id: customLinkId,
      label,
      url,
      filters,
      toasts,
    });
    setIsSaving(false);
    onSave();
  };

  return (
    <form onSubmit={onSubmit} id="customLink_form">
      <EuiFlyout ownFocus onClose={onClose} size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.apm.settings.customLink.flyout.title', {
                defaultMessage: 'Create link',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              {i18n.translate('xpack.apm.settings.customLink.flyout.label', {
                defaultMessage:
                  'Links will be available in the context of transaction details throughout the APM app. You can create an unlimited number of links. You can refer to dynamic variables by using any of the transaction metadata to fill in your URLs. More information, including examples, are available in the',
              })}{' '}
              <Documentation
                label={i18n.translate(
                  'xpack.apm.settings.customLink.flyout.label.doc',
                  {
                    defaultMessage: 'documentation.',
                  }
                )}
              />
            </p>
          </EuiText>

          <EuiSpacer size="l" />

          <LinkSection
            label={label}
            onChangeLabel={setLabel}
            url={url}
            onChangeUrl={setUrl}
          />

          <EuiSpacer size="l" />

          <FiltersSection filters={filters} onChangeFilters={setFilters} />

          <EuiSpacer size="l" />

          <LinkPreview label={label} url={url} filters={filters} />
        </EuiFlyoutBody>

        <FlyoutFooter
          isSaveButtonEnabled={isFormValid}
          onClose={onClose}
          isSaving={isSaving}
          onDelete={onDelete}
          customLinkId={customLinkId}
        />
      </EuiFlyout>
    </form>
  );
}
