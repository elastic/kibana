/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from "react";
import { RouteComponentProps } from "react-router";
import { Index } from '../../../common';
import { Section } from '../../../common/constants';
import { resetIndexUrlParams } from "../sections/home/index_list/details_page/reset_index_url_params";
import { loadIndex } from "../services";
import { Error } from '../../shared_imports';

export const useIndexDetailsFunctions = (indexName: string, search:string, history : RouteComponentProps['history']) => {
  const [isIndicesLoading, setIsIndicesLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [index, setIndex] = useState<Index | null>();

  const fetchIndexDetails = useCallback(async () => {
    if (indexName) {
      setIsIndicesLoading(true);
      try {
        const { data, error: loadingError } = await loadIndex(indexName);
        setIsIndicesLoading(false);
        setError(loadingError);
        setIndex(data);
      } catch (e) {
        setIsIndicesLoading(false);
        setError(e);
      }
    }
  }, [indexName]);

  const navigateToIndicesList = useCallback(() => {
    const paramsString = resetIndexUrlParams(search);
    history.push(`/${Section.Indices}${paramsString ? '?' : ''}${paramsString}`);
  }, [history, search]);

  return {isIndicesLoading, error, index, fetchIndexDetails, navigateToIndicesList}
}
