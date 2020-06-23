/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiModal,
  EuiButtonEmpty,
  EuiOverlayMask,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { Role } from '../../../../../../../common/model';
import { PrivilegeSummaryTable } from './privilege_summary_table';
import { KibanaPrivileges } from '../../../../model';

interface Props {
  role: Role;
  spaces: Space[];
  kibanaPrivileges: KibanaPrivileges;
  canCustomizeSubFeaturePrivileges: boolean;
}
export const PrivilegeSummary = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <EuiButtonEmpty onClick={() => setIsOpen(true)} data-test-subj="viewPrivilegeSummaryButton">
        <FormattedMessage
          id="xpack.security.management.editRole.privilegeSummary.viewSummaryButtonText"
          defaultMessage="View privilege summary"
        />
      </EuiButtonEmpty>
      {isOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setIsOpen(false)} maxWidth={false}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="xpack.security.management.editRole.privilegeSummary.modalHeaderTitle"
                  defaultMessage="Privilege summary"
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <PrivilegeSummaryTable
                role={props.role}
                spaces={props.spaces}
                kibanaPrivileges={props.kibanaPrivileges}
                canCustomizeSubFeaturePrivileges={props.canCustomizeSubFeaturePrivileges}
              />
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={() => setIsOpen(false)}>
                <FormattedMessage
                  id="xpack.security.management.editRole.privilegeSummary.closeSummaryButtonText"
                  defaultMessage="Close"
                />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
