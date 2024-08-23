/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { Index } from '../../../common';
import { Section } from '../../../common/constants';
import { resetIndexUrlParams } from '../sections/home/index_list/details_page/reset_index_url_params';
import { deleteIndices, loadIndex } from '../services';
import { Error } from '../../shared_imports';
import { notificationService } from '../services/notification';

export const useIndexFunctions = (
  indexName: string,
  search: string,
  history: RouteComponentProps['history']
) => {
  const [isIndicesLoading, setIsIndicesLoading] = useState(false);
  const [indexLoadingError, setIndexLoadingError] = useState<Error | null>(null);
  const [index, setIndex] = useState<Index | null>();
  const [isDeleteLoading, setDeleteLoading] = useState(false);

  const fetchIndexDetails = useCallback(async () => {
    if (indexName) {
      setIsIndicesLoading(true);
      try {
        const { data, error: loadingError } = await loadIndex(indexName);
        setIsIndicesLoading(false);
        setIndexLoadingError(loadingError);
        setIndex(data);
      } catch (e) {
        setIsIndicesLoading(false);
        setIndexLoadingError(e);
      }
    }
  }, [indexName]);

  const navigateToIndicesList = useCallback(() => {
    const paramsString = resetIndexUrlParams(search);
    history.push(`/${Section.Indices}${paramsString ? '?' : ''}${paramsString}`);
  }, [history, search]);

  const deleteIndex = useCallback(async () => {
    if (indexName) {
      setDeleteLoading(true);
      try {
        await deleteIndices([indexName]);
        setDeleteLoading(false);
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.searchIndexDetails.indexDeletedMessage', {
            defaultMessage: 'The index {indexName} was deleted.',
            values: { indexName },
          })
        );
        navigateToIndicesList();
      } catch (error) {
        setDeleteLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    }
  }, [navigateToIndicesList, indexName]);

  return {
    isIndicesLoading,
    isDeleteLoading,
    indexLoadingError,
    index,
    fetchIndexDetails,
    navigateToIndicesList,
    deleteIndex,
  };
};
