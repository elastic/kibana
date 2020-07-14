/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

const localKey = 'xpack.uptime.detailPage.selectedView';

interface Props {
  selectedView: string;
  setSelectedView: (val: string) => void;
}

export const useSelectedView = (): Props => {
  const getSelectedView = localStorage.getItem(localKey) ?? 'list';

  const [selectedView, setSelectedView] = useState(getSelectedView);

  useEffect(() => {
    localStorage.setItem(localKey, selectedView);
  }, [selectedView]);

  return { selectedView, setSelectedView };
};
