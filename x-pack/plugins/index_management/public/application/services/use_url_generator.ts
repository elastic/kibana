/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import {
  UrlGeneratorContract,
  UrlGeneratorId,
  UrlGeneratorStateMapping,
} from '../../../../../../src/plugins/share/public';
import { useAppContext } from '../app_context';

export const useUrlGenerator = ({
  urlGeneratorId,
  urlGeneratorState,
  setLinkCallback,
}: {
  urlGeneratorId: UrlGeneratorId;
  urlGeneratorState: UrlGeneratorStateMapping[UrlGeneratorId]['State'];
  setLinkCallback: (link: string) => void;
}) => {
  const { urlGenerators } = useAppContext();
  useEffect(() => {
    const updateLink = async (): Promise<void> => {
      let urlGenerator: UrlGeneratorContract<any>;
      try {
        urlGenerator = urlGenerators.getUrlGenerator(urlGeneratorId);
        const url = await urlGenerator.createUrl(urlGeneratorState);
        setLinkCallback(url);
      } catch (e) {
        // do nothing
      }
    };

    updateLink();
  }, [urlGeneratorId, urlGeneratorState, setLinkCallback, urlGenerators]);
};
