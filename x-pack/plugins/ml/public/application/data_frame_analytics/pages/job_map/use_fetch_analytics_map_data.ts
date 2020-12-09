/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { uniqWith, isEqual } from 'lodash';
import cytoscape from 'cytoscape';
import { ml } from '../../../services/ml_api_service';
import { JOB_MAP_NODE_TYPES } from '../../../../../common/constants/data_frame_analytics';
import { AnalyticsMapReturnType } from '../../../../../common/types/data_frame_analytics';

interface GetDataObjectParameter {
  analyticsId?: string;
  id?: string;
  modelId?: string;
  type?: string;
}

export const useFetchAnalyticsMapData = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const [nodeDetails, setNodeDetails] = useState<Record<string, any>>({});
  const [error, setError] = useState<any>();
  const [message, setMessage] = useState<string | undefined>();

  const fetchAndSetElements = async (idToUse: string, treatAsRoot: boolean, type?: string) => {
    setIsLoading(true);
    // Pass in treatAsRoot flag - endpoint will take job or index to grab jobs created from it
    const analyticsMap: AnalyticsMapReturnType = await ml.dataFrameAnalytics.getDataFrameAnalyticsMap(
      idToUse,
      treatAsRoot,
      type
    );

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
        setNodeDetails(details);
      } else {
        const uniqueElements = uniqWith([...nodeElements, ...elements], isEqual);
        setElements(uniqueElements);
        setNodeDetails({ ...details, ...nodeDetails });
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
  };

  return {
    elements,
    error,
    fetchAndSetElementsWrapper,
    isLoading,
    message,
    nodeDetails,
    setElements,
    setError,
  };
};
