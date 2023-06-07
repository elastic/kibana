/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export function useShowSections(
  isEditMode: boolean,
  isFormValidating: boolean,
  isSourceSectionValid: boolean,
  isObjectiveSectionValid: boolean
) {
  const [showDescriptionSection, setShowDescriptionSection] = useState<boolean>(isEditMode);
  const [showObjectiveSection, setShowObjectiveSection] = useState<boolean>(isEditMode);

  useEffect(() => {
    if (!isFormValidating && !showObjectiveSection && isSourceSectionValid) {
      setShowObjectiveSection(true);
    }
  }, [showObjectiveSection, isSourceSectionValid, isFormValidating]);

  useEffect(() => {
    if (
      !isFormValidating &&
      !showDescriptionSection &&
      isSourceSectionValid &&
      isObjectiveSectionValid
    ) {
      setShowDescriptionSection(true);
    }
  }, [showDescriptionSection, isSourceSectionValid, isObjectiveSectionValid, isFormValidating]);

  return { showDescriptionSection, showObjectiveSection };
}
