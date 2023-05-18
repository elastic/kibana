/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';
import type { EuiSwitchProps } from '@elastic/eui/src/components/form/switch/switch';
import { useUrlParams } from '../../../../../hooks/use_url_params';
import { useSetUrlParams } from '../../../../../components/artifact_list_page/hooks/use_set_url_params';

export const PocOptions = memo((props) => {
  const { urlParams } = usePocUrlOptions();
  const setUrlParams = useSetUrlParams();

  const handleSwitchOnChange: EuiSwitchProps['onChange'] = useCallback(
    (ev) => {
      const param = ev.target.name;
      const enabled = ev.target.checked || undefined;

      if (param) {
        setUrlParams({
          ...urlParams,
          [param]: enabled,
        });
      }
    },
    [setUrlParams, urlParams]
  );

  return (
    <div>
      <EuiTitle>
        <h4>{'Development POC URL modifiers:'}</h4>
      </EuiTitle>

      <EuiSpacer />

      <EuiFormRow label={'Show section labels above content'}>
        <EuiSwitch
          label={urlParams.sectionTitlesAboveContent ? 'Yes' : 'No'}
          checked={Boolean(urlParams.sectionTitlesAboveContent)}
          name="sectionTitlesAboveContent"
          onChange={handleSwitchOnChange}
        />
      </EuiFormRow>
    </div>
  );
});
PocOptions.displayName = 'PocOptions';

export const usePocUrlOptions = () => {
  return useUrlParams<{ sectionTitlesAboveContent?: boolean }>();
};
