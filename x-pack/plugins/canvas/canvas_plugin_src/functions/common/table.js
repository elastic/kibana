export const table = () => ({
  name: 'table',
  aliases: [],
  type: 'render',
  help: 'Configure a Data Table element',
  context: {
    types: ['datatable'],
  },
  args: {
    font: {
      types: ['style'],
      default: '{font}',
      help: 'Font style',
    },
    paginate: {
      types: ['boolean'],
      default: true,
      help: 'Show pagination controls. If set to false only the first page will be displayed.',
    },
    perPage: {
      types: ['number'],
      default: 10,
      help: 'Show this many rows per page. You probably want to raise this is disabling pagination',
    },
    showHeader: {
      types: ['boolean'],
      default: true,
      help: 'Show or hide the header row with titles for each column.',
    },
  },
  fn: (context, args) => {
    const { font, paginate, perPage, showHeader } = args;

    return {
      type: 'render',
      as: 'table',
      value: {
        datatable: context,
        font,
        paginate,
        perPage,
        showHeader,
      },
    };
  },
});
