/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { ActionConnector } from '../../../../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useActionsConnectorsContext } from '../../../../../triggers_actions_ui/public/common';
import * as i18n from './translations';
interface Props {
  connector: ActionConnector;
  onClose: () => void;
}
export const FieldMappingFlyout = ({ connector, onClose }: Props) => {
  const { actionTypeRegistry } = useActionsConnectorsContext();
  const closeFlyout = useCallback(() => {
    onClose();
  }, [onClose]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const onSaveClicked = useCallback(
    (closeAfterSave: boolean = true) => {
      setIsSaving(true);
      setIsSaving(false);
      if (closeAfterSave) {
        closeFlyout();
      }
    },
    [closeFlyout]
  );
  const actionTypeModel = useMemo(() => actionTypeRegistry.get(connector.actionTypeId), [
    actionTypeRegistry,
    connector.actionTypeId,
  ]);
  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionEditTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>{i18n.EDIT_FIELD_MAPPING_TITLE(connector.name)}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{'body'}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>{i18n.CANCEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="secondary"
                  data-test-subj="saveMappingsActionButton"
                  isLoading={isSaving}
                  onClick={() => onSaveClicked(false)}
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="secondary"
                  data-test-subj="saveAndCloseMappingsActionButton"
                  isLoading={isSaving}
                  onClick={() => onSaveClicked()}
                >
                  {i18n.SAVE_CLOSE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
