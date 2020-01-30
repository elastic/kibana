/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
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
import { Role, KibanaPrivileges, SecuredFeature } from '../../../../../../../common/model';
import { PrivilegeSummaryTable } from './privilege_summary_table';

interface Props {
  role: Role;
  spaces: Space[];
  features: SecuredFeature[];
  kibanaPrivileges: KibanaPrivileges;
}
export const PrivilegeSummary = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <EuiButtonEmpty onClick={() => setIsOpen(true)}>View privilege summary</EuiButtonEmpty>
      {isOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setIsOpen(false)}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Privilege summary</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <PrivilegeSummaryTable
                role={props.role}
                spaces={props.spaces}
                features={props.features}
                kibanaPrivileges={props.kibanaPrivileges}
              />
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={() => setIsOpen(false)}>Close</EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
