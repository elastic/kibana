/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../src/setup_node_env');

const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const fetch = require('node-fetch');
// eslint-disable-next-line import/no-extraneous-dependencies
const { camelCase, sortBy } = require('lodash');
const { resolve } = require('path');

const OUTPUT_DIRECTORY = resolve('public', 'detections', 'mitre');

// Every release we should update the version of MITRE ATT&CK content and regenerate the model in our code.
// This version must correspond to the one used for prebuilt rules in https://github.com/elastic/detection-rules.
// This version is basically a tag on https://github.com/mitre/cti/tags, or can be a branch name like `master`.
const MITRE_CONTENT_VERSION = 'ATT&CK-v11.3'; // last updated when preparing for 8.4.0 release
const MITRE_CONTENT_URL = `https://raw.githubusercontent.com/mitre/cti/${MITRE_CONTENT_VERSION}/enterprise-attack/enterprise-attack.json`;

const getTacticsOptions = (tactics) =>
  tactics.map((t) =>
    `{
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  text: i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttackTactics.${camelCase(t.name)}Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getTechniquesOptions = (techniques) =>
  techniques.map((t) =>
    `{
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttackTechniques.${camelCase(
      t.name
    )}Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  tactics: '${t.tactics.join()}',
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getSubtechniquesOptions = (subtechniques) =>
  subtechniques.map((t) =>
    `{
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.${camelCase(t.name)}${
      t.techniqueId // Seperates subtechniques that have the same name but belong to different techniques
    }Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  tactics: '${t.tactics.join()}',
  techniqueId: '${t.techniqueId}',
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getIdReference = (references) => {
  const ref = references.find((r) => r.source_name === 'mitre-attack');
  if (ref != null) {
    return {
      id: ref.external_id,
      reference: ref.url,
    };
  } else {
    return { id: '', reference: '' };
  }
};

const extractTacticsData = (mitreData) => {
  const tactics = mitreData
    .filter((obj) => obj.type === 'x-mitre-tactic')
    .reduce((acc, item) => {
      const { id, reference } = getIdReference(item.external_references);

      return [
        ...acc,
        {
          displayName: item.name,
          shortName: item.x_mitre_shortname,
          id,
          reference,
        },
      ];
    }, []);

  return sortBy(tactics, 'displayName');
};

const normalizeTacticsData = (tacticsData) => {
  return tacticsData.map((data) => {
    const { displayName, id, reference } = data;
    return { name: displayName, id, reference };
  });
};

const extractTechniques = (mitreData) => {
  const techniques = mitreData
    .filter(
      (obj) =>
        obj.type === 'attack-pattern' &&
        (obj.x_mitre_is_subtechnique === false || obj.x_mitre_is_subtechnique === undefined)
    )
    .reduce((acc, item) => {
      let tactics = [];
      const { id, reference } = getIdReference(item.external_references);
      if (item.kill_chain_phases != null && item.kill_chain_phases.length > 0) {
        item.kill_chain_phases.forEach((tactic) => {
          tactics = [...tactics, tactic.phase_name];
        });
      }

      return [
        ...acc,
        {
          name: item.name,
          id,
          reference,
          tactics,
        },
      ];
    }, []);

  return sortBy(techniques, 'name');
};

const extractSubtechniques = (mitreData) => {
  const subtechniques = mitreData
    .filter((obj) => obj.x_mitre_is_subtechnique === true)
    .reduce((acc, item) => {
      let tactics = [];
      const { id, reference } = getIdReference(item.external_references);
      if (item.kill_chain_phases != null && item.kill_chain_phases.length > 0) {
        item.kill_chain_phases.forEach((tactic) => {
          tactics = [...tactics, tactic.phase_name];
        });
      }
      const techniqueId = id.split('.')[0];

      return [
        ...acc,
        {
          name: item.name,
          id,
          reference,
          tactics,
          techniqueId,
        },
      ];
    }, []);

  return sortBy(subtechniques, 'name');
};

const buildMockThreatData = (tacticsData, techniques, subtechniques) => {
  const subtechnique = subtechniques[0];
  const technique = techniques.find((technique) => technique.id === subtechnique.techniqueId);
  const tactic = tacticsData.find((tactic) => tactic.shortName === technique.tactics[0]);

  return {
    tactic: normalizeTacticsData([tactic])[0],
    technique,
    subtechnique,
  };
};

async function main() {
  fetch(MITRE_CONTENT_URL)
    .then((res) => res.json())
    .then((json) => {
      const mitreData = json.objects;
      const tacticsData = extractTacticsData(mitreData);
      const tactics = normalizeTacticsData(tacticsData);
      const techniques = extractTechniques(mitreData);
      const subtechniques = extractSubtechniques(mitreData);

      const body = `/*
          * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
          * or more contributor license agreements. Licensed under the Elastic License
          * 2.0; you may not use this file except in compliance with the Elastic License
          * 2.0.
          */

          // THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY
          // Please modify the 'extract_tactics_techniques_mitre.js' script directly and
          // run 'yarn extract-mitre-attacks' from the root 'security_solution' plugin directory

          import { i18n } from '@kbn/i18n';

          import { MitreTacticsOptions, MitreTechniquesOptions, MitreSubtechniquesOptions } from './types';

          export const tactics = ${JSON.stringify(tactics, null, 2)};

          export const tacticsOptions: MitreTacticsOptions[] =
            ${JSON.stringify(getTacticsOptions(tactics), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          export const technique = ${JSON.stringify(techniques, null, 2)};

          export const techniquesOptions: MitreTechniquesOptions[] =
            ${JSON.stringify(getTechniquesOptions(techniques), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          export const subtechniques = ${JSON.stringify(subtechniques, null, 2)};

          export const subtechniquesOptions: MitreSubtechniquesOptions[] =
            ${JSON.stringify(getSubtechniquesOptions(subtechniques), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          /**
           * A full object of Mitre Attack Threat data that is taken directly from the \`mitre_tactics_techniques.ts\` file
           *
           * Is built alongside and sampled from the data in the file so to always be valid with the most up to date MITRE ATT&CK data
           */
          export const getMockThreatData = () => (${JSON.stringify(
            buildMockThreatData(tacticsData, techniques, subtechniques),
            null,
            2
          )
            .replace(/}"/g, '}')
            .replace(/"{/g, '{')});
      `;

      fs.writeFileSync(`${OUTPUT_DIRECTORY}/mitre_tactics_techniques.ts`, body, 'utf-8');
    });
}

if (require.main === module) {
  main();
}
