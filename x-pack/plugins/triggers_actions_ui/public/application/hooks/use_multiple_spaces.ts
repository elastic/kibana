/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useSpacesData } from '../../common/lib/kibana';

interface UseMultipleSpacesProps {
  setShowFromAllSpaces: React.Dispatch<React.SetStateAction<boolean>>;
  showFromAllSpaces: boolean;
  visibleColumns: string[];
  setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

export const useMultipleSpaces = (props: UseMultipleSpacesProps) => {
  const { setShowFromAllSpaces, showFromAllSpaces, visibleColumns, setVisibleColumns } = props;

  const spacesData = useSpacesData();

  const onShowAllSpacesChange = useCallback(() => {
    setShowFromAllSpaces((prev) => !prev);
    const nextShowFromAllSpaces = !showFromAllSpaces;

    if (nextShowFromAllSpaces && !visibleColumns.includes('space_ids')) {
      const connectorNameIndex = visibleColumns.findIndex((c) => c === 'connector_name');
      const newVisibleColumns = [...visibleColumns];
      newVisibleColumns.splice(connectorNameIndex + 1, 0, 'space_ids');
      setVisibleColumns(newVisibleColumns);
    } else if (!nextShowFromAllSpaces && visibleColumns.includes('space_ids')) {
      setVisibleColumns(visibleColumns.filter((c) => c !== 'space_ids'));
    }
  }, [setShowFromAllSpaces, showFromAllSpaces, visibleColumns, setVisibleColumns]);

  const accessibleSpaceIds = useMemo(
    () => (spacesData ? [...spacesData.spacesMap.values()].map((e) => e.id) : []),
    [spacesData]
  );
  const canAccessMultipleSpaces = useMemo(
    () => accessibleSpaceIds.length > 1,
    [accessibleSpaceIds]
  );
  const namespaces = useMemo(
    () => (showFromAllSpaces && spacesData ? accessibleSpaceIds : undefined),
    [showFromAllSpaces, spacesData, accessibleSpaceIds]
  );
  const activeSpace = useMemo(
    () => spacesData?.spacesMap.get(spacesData?.activeSpaceId),
    [spacesData]
  );

  return {
    onShowAllSpacesChange,
    canAccessMultipleSpaces,
    namespaces,
    activeSpace,
  };
};
