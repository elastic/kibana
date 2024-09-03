/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { asyncForEach } from '@kbn/std';
import { uniqWith, isEqual } from 'lodash';
import type cytoscape from 'cytoscape';
import {
  JOB_MAP_NODE_TYPES,
  type AnalyticsMapReturnType,
} from '@kbn/ml-data-frame-analytics-utils';
import { useMlApiContext } from '../../../contexts/kibana';
interface GetDataObjectParameter {
  analyticsId?: string;
  id?: string;
  modelId?: string;
  type?: string;
}

export const useFetchAnalyticsMapData = () => {
  const ml = useMlApiContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const [error, setError] = useState<any>();
  const [message, setMessage] = useState<string | undefined>();
  // Keeps track of which nodes have been used as root so we can refetch related nodes on refresh
  const [usedAsRoot, setUsedAsRoot] = useState<Record<string, string | undefined>>({});
  const nodeDetails = useRef<Record<string, any>>({});

  const fetchAndSetElements = async (idToUse: string, treatAsRoot: boolean, type?: string) => {
    setIsLoading(true);
    if (treatAsRoot && usedAsRoot[idToUse] === undefined) {
      setUsedAsRoot({ ...usedAsRoot, [idToUse]: type });
    }
    // Pass in treatAsRoot flag - endpoint will take job or index to grab jobs created from it
    const analyticsMap: AnalyticsMapReturnType =
      await ml.dataFrameAnalytics.getDataFrameAnalyticsMap(idToUse, treatAsRoot, type);

    const { elements: nodeElements, details, error: fetchError } = analyticsMap;

    if (fetchError !== null) {
      setIsLoading(false);
      setError(fetchError);
    }

    if (nodeElements?.length === 0) {
      setMessage(
        i18n.translate('xpack.ml.dataframe.analyticsMap.emptyResponseMessage', {
          defaultMessage: 'No related analytics jobs found for {id}.',
          values: { id: idToUse },
        })
      );
    }

    if (nodeElements?.length > 0) {
      if (treatAsRoot === false) {
        setElements(nodeElements);
        nodeDetails.current = details;
      } else {
        const uniqueElements = uniqWith([...nodeElements, ...elements], isEqual);
        setElements(uniqueElements);
        nodeDetails.current = { ...details, ...nodeDetails.current };
      }
    }
    setIsLoading(false);
  };

  const fetchAndSetElementsWrapper = async (params?: GetDataObjectParameter) => {
    const { analyticsId, id, modelId, type } = params ?? {};
    const treatAsRoot = id !== undefined;
    let idToUse: string;

    if (id !== undefined) {
      idToUse = id;
    } else if (modelId !== undefined) {
      idToUse = modelId;
    } else {
      idToUse = analyticsId as string;
    }

    await fetchAndSetElements(
      idToUse,
      treatAsRoot,
      modelId !== undefined && treatAsRoot === false ? JOB_MAP_NODE_TYPES.TRAINED_MODEL : type
    );

    // If related nodes had been fetched from any node then refetch
    if (Object.keys(usedAsRoot).length) {
      await asyncForEach(Object.keys(usedAsRoot), async (nodeId) => {
        await fetchAndSetElements(nodeId, true, usedAsRoot[nodeId]);
      });
    }
  };

  return {
    elements,
    error,
    fetchAndSetElementsWrapper,
    isLoading,
    message,
    nodeDetails: nodeDetails.current,
    setElements,
    setError,
  };
};
