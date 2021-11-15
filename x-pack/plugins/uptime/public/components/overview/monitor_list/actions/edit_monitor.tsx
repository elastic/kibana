/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { useState } from 'react';
import { AddMonitorModal } from './add_monitor_modal';
import { MonitorSavedObject } from '../../../../../common/types';

interface Props {
  monitor: MonitorSavedObject;
}
export const EditMonitor = ({ monitor }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => setIsModalVisible(true);

  const onEdit = async () => {
    showModal();
  };

  return (
    <>
      <EuiButtonIcon iconType="documentEdit" onClick={() => onEdit()} />
      {isModalVisible && (
        <AddMonitorModal
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          monitor={monitor}
        />
      )}
    </>
  );
};
