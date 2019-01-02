/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { configBlockSchemas } from '../../../common/config_schemas';
// import { translateConfigSchema } from '../../../common/config_schemas_translations_map';
// import { CMTagsAdapter } from '../adapters/tags/adapter_types';
// import { TagsLib } from '../tags';

// describe('Tags Client Domain Lib', () => {
//   let tagsLib: TagsLib;

//   beforeEach(async () => {
//     tagsLib = new Config({} as CMTagsAdapter, translateConfigSchema(configBlockSchemas));
//   });

//   it('should use helper function to convert users yaml in tag to config object', async () => {
//     const convertedTag = tagsLib.userConfigsToJson([
//       {
//         id: 'foo',
//         configuration_blocks: [
//           {
//             type: 'filebeat.inputs',
//             description: 'string',
//             config: {
//               paths: ['adad/adasd'],
//               other: "something: 'here'",
//             },
//           },
//         ],
//         color: 'red',
//         last_updated: new Date(),
//       },
//     ]);

//     expect(convertedTag.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks[0]).toHaveProperty('config');
//     expect(convertedTag[0].configuration_blocks[0].config).not.toHaveProperty('other');
//     expect(convertedTag[0].configuration_blocks[0].config).toHaveProperty('something');
//     // @ts-ignore
//     expect(convertedTag[0].configuration_blocks[0].config.something).toBe('here');
//   });

//   it('should use helper function to convert user config to json with undefined `other`', async () => {
//     const convertedTag = tagsLib.userConfigsToJson([
//       {
//         id: 'fsdfsdfs',
//         color: '#DD0A73',
//         configuration_blocks: [
//           {
//             type: 'filebeat.inputs',
//             description: 'sdfsdf',
//             config: {
//               paths: ['sdfsfsdf'],
//               other: undefined,
//             },
//           },
//         ],
//         last_updated: new Date('2018-09-04T15:52:08.983Z'),
//       },
//     ]);

//     expect(convertedTag.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks[0]).not.toHaveProperty('other');
//   });

//   it('should use helper function to convert users yaml in tag to config object, where empty other leads to no other fields saved', async () => {
//     const convertedTag = tagsLib.userConfigsToJson([
//       {
//         id: 'foo',
//         configuration_blocks: [
//           {
//             type: 'filebeat.inputs',
//             description: 'string',
//             config: {
//               paths: ['adad/adasd'],
//               other: '',
//             },
//           },
//         ],
//         color: 'red',
//         last_updated: new Date(),
//       },
//     ]);

//     expect(convertedTag.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks[0]).not.toHaveProperty('other');
//   });

//   it('should convert tokenized fields to JSON', async () => {
//     const convertedTag = tagsLib.userConfigsToJson([
//       {
//         id: 'dfgdfgdfgdfgdfg',
//         color: '#DD0A73',
//         configuration_blocks: [
//           {
//             type: 'output',
//             description: 'something',
//             config: {
//               _sub_type: 'console',
//               hosts: ['esefsfsgg', 'drgdrgdgr'],
//               username: '',
//               password: '',
//             },
//           },
//         ],
//         last_updated: new Date('2018-10-22T23:59:59.016Z'),
//       },
//     ]);

//     expect(convertedTag.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks[0].config).toHaveProperty('_sub_type');
//     expect(convertedTag[0].configuration_blocks[0].config).toHaveProperty('hosts');
//     // @ts-ignore
//     expect(convertedTag[0].configuration_blocks[0].config.hosts.length).toBe(2);
//   });

//   it('should use helper function to convert config object to users yaml', async () => {
//     const convertedTag = tagsLib.jsonConfigToUserYaml([
//       {
//         id: 'fsdfsdfs',
//         color: '#DD0A73',
//         configuration_blocks: [
//           {
//             type: 'filebeat.inputs',
//             description: 'sdfsdf',
//             config: {
//               paths: ['sdfsfsdf'],
//               something: 'here',
//             },
//           },
//         ],
//         last_updated: new Date('2018-09-04T15:52:08.983Z'),
//       },
//     ]);

//     expect(convertedTag.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks[0].config).not.toHaveProperty('something');
//     expect(convertedTag[0].configuration_blocks[0].config).toHaveProperty('other');
//     expect(convertedTag[0].configuration_blocks[0].config.other).toBe('something: here\n');
//   });

//   it('should use helper function to convert config object to users yaml with empty `other`', async () => {
//     const convertedTag = tagsLib.jsonConfigToUserYaml([
//       {
//         id: 'fsdfsdfs',
//         color: '#DD0A73',
//         configuration_blocks: [
//           {
//             type: 'filebeat.inputs',
//             description: undefined,
//             config: {
//               paths: ['sdfsfsdf'],
//             },
//           },
//         ],
//         last_updated: new Date('2018-09-04T15:52:08.983Z'),
//       },
//     ]);

//     expect(convertedTag.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks.length).toBe(1);
//     expect(convertedTag[0].configuration_blocks[0].config).not.toHaveProperty('something');
//     expect(convertedTag[0].configuration_blocks[0].config).toHaveProperty('other');
//     expect(convertedTag[0].configuration_blocks[0].config.other).toBe('');
//   });
// });
