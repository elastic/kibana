export const markdown = () => ({
  name: 'markdown',
  displayName: 'Markdown',
  help: 'Generate markup using markdown',
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: 'Markdown content',
      help: 'Markdown formatted text',
      argType: 'textarea',
      default: '""',
      options: {
        confirm: 'Apply',
      },
      multi: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
  ],
});
