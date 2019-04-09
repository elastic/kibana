import { Plugin, PluginSetupContext } from '../../../../src/core/public';

// export const code = (kibana: any) =>
//   new kibana.Plugin({
//     require: ['kibana', 'elasticsearch', 'xpack_main'],
//     id: 'code',
//     configPrefix: 'xpack.code',
//     publicDir: resolve(__dirname, 'public'),

//     uiExports: {
//       app: {
//         title: 'Code',
//         main: 'plugins/code/app',
//         euiIconType: 'codeApp',
//       },
//       styleSheetPaths: resolve(__dirname, 'public/index.scss'),
//     },
//     config(Joi: typeof JoiNamespace) {

//     },
//     init,
//   });

export class CodePlugin implements Plugin<CodePluginSetup> {
  public setup(core: PluginSetupContext, deps: {}) {
    // eslint-disable-next-line no-console
    console.log(`code plugin loaded`);
  }
}

export type CodePluginSetup = ReturnType<CodePlugin['setup']>;