/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiPopover,
  EuiButton,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';

import { ComponentTemplateSerialized } from '../../../../common';
import { CreateButtonPopOver } from './components';
import { ComponentTemplatesContainer } from './component_templates_container';

interface Props {
  onClose(): void;
}

export const ComponentTemplatesFlyout = ({ onClose }: Props) => {
  const [componentTemplatesCount, setComponentTemplatesCount] = useState<number>(0);

  const onComponents = useCallback((components: ComponentTemplateSerialized[]) => {
    setComponentTemplatesCount(components.length);
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="componentTemplatesFlyout"
      aria-labelledby="componentTemplatesFlyoutTitle"
      size="m"
      maxWidth={500}
    >
      <EuiFlyoutHeader>
        {componentTemplatesCount > 0 && (
          <EuiTitle size="m">
            <h2 id="componentTemplatesFlyoutTitle" data-test-subj="title">
              Component templates
            </h2>
          </EuiTitle>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">
        <ComponentTemplatesContainer onComponents={onComponents} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={onClose}
              data-test-subj="closeDetailsButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplatesFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {componentTemplatesCount > 0 && (
            <EuiFlexItem grow={false}>
              <CreateButtonPopOver />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
