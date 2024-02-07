/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiLink, EuiFlexGroup, EuiButtonEmpty } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { BuildThreatDescription } from './types';
import type {
  MitreSubTechnique,
  MitreTactic,
  MitreTechnique,
} from '../../../../detections/mitre/types';
import ListTreeIcon from './assets/list_tree_icon.svg';

const lazyMitreConfiguration = () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    '../../../../detections/mitre/mitre_tactics_techniques'
  );
};

const ThreatEuiFlexGroupStyles = styled(EuiFlexGroup)`
  .euiFlexItem {
    margin-bottom: 0px;
  }
`;

const SubtechniqueFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeM};
`;

const TechniqueLinkItem = styled(EuiButtonEmpty)`
  .euiIcon {
    width: 8px;
    height: 8px;
  }
  align-self: flex-start;
`;

export const ThreatEuiFlexGroup = ({
  threat,
  'data-test-subj': dataTestSubj = 'threat',
}: BuildThreatDescription) => {
  const [techniquesOptions, setTechniquesOptions] = useState<MitreTechnique[]>([]);
  const [tacticsOptions, setTacticsOptions] = useState<MitreTactic[]>([]);
  const [subtechniquesOptions, setSubtechniquesOptions] = useState<MitreSubTechnique[]>([]);

  useEffect(() => {
    async function getMitre() {
      const mitreConfig = await lazyMitreConfiguration();
      setSubtechniquesOptions(mitreConfig.subtechniques);
      setTechniquesOptions(mitreConfig.techniques);
      setTacticsOptions(mitreConfig.tactics);
    }
    getMitre();
  }, []);

  return (
    <ThreatEuiFlexGroupStyles direction="column" data-test-subj={dataTestSubj}>
      {threat.map((singleThreat, index) => {
        const tactic = tacticsOptions.find((t) => t.id === singleThreat.tactic.id);
        return (
          <EuiFlexItem key={`${singleThreat.tactic.name}-${index}`}>
            <EuiLink
              data-test-subj="threatTacticLink"
              href={singleThreat.tactic.reference}
              target="_blank"
            >
              {tactic != null
                ? tactic.label
                : `${singleThreat.tactic.name} (${singleThreat.tactic.id})`}
            </EuiLink>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
              {singleThreat.technique &&
                singleThreat.technique.map((technique, techniqueIndex) => {
                  const myTechnique = techniquesOptions.find((t) => t.id === technique.id);
                  return (
                    <EuiFlexItem key={myTechnique?.id ?? techniqueIndex}>
                      <TechniqueLinkItem
                        data-test-subj="threatTechniqueLink"
                        href={technique.reference}
                        target="_blank"
                        iconType={ListTreeIcon}
                        size="xs"
                      >
                        {myTechnique != null
                          ? myTechnique.label
                          : `${technique.name} (${technique.id})`}
                      </TechniqueLinkItem>
                      <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
                        {technique.subtechnique != null &&
                          technique.subtechnique.map((subtechnique, subtechniqueIndex) => {
                            const mySubtechnique = subtechniquesOptions.find(
                              (t) => t.id === subtechnique.id
                            );
                            return (
                              <SubtechniqueFlexItem key={mySubtechnique?.id ?? subtechniqueIndex}>
                                <TechniqueLinkItem
                                  data-test-subj="threatSubtechniqueLink"
                                  href={subtechnique.reference}
                                  target="_blank"
                                  iconType={ListTreeIcon}
                                  size="xs"
                                >
                                  {mySubtechnique != null
                                    ? mySubtechnique.label
                                    : `${subtechnique.name} (${subtechnique.id})`}
                                </TechniqueLinkItem>
                              </SubtechniqueFlexItem>
                            );
                          })}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  );
                })}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </ThreatEuiFlexGroupStyles>
  );
};
