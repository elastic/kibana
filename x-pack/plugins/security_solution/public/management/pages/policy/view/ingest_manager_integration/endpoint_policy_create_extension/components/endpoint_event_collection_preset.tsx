/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { HelpTextWithPadding } from './help_text_with_padding';
import { DATA_COLLECTION, DATA_COLLECTION_HELP_TEXT } from '../translations';
import { useGetProtectionsUnavailableComponent } from '../../../policy_settings_form/hooks/use_get_protections_unavailable_component';

const NOOP = () => {};

type EndpointEventCollectionPresetProps = PackagePolicyCreateExtensionComponentProps;

/**
 * Display ONLY the event collection option on the screen along with the upselling message
 */
export const EndpointEventCollectionPreset = memo<EndpointEventCollectionPresetProps>(
  ({ onChange, newPolicy }) => {
    const UpsellToIncludePolicyProtections = useGetProtectionsUnavailableComponent();

    return (
      <div>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          helpText={<HelpTextWithPadding>{DATA_COLLECTION_HELP_TEXT}</HelpTextWithPadding>}
        >
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id="endpoint_data_collection_only_preset"
                onChange={NOOP}
                disabled
                checked
              />
            </EuiFlexItem>
            <EuiFlexItem>{DATA_COLLECTION}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {UpsellToIncludePolicyProtections && (
          <>
            <EuiSpacer size="xl" />
            <UpsellToIncludePolicyProtections />
          </>
        )}
      </div>
    );
  }
);
EndpointEventCollectionPreset.displayName = 'EndpointEventCollectionPreset';
