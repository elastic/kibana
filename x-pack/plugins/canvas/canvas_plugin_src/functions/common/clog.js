export const clog = () => ({
  name: 'clog',
  help: 'Outputs the context to the console',
  fn: context => {
    console.log(context); //eslint-disable-line no-console
    return context;
  },
});
