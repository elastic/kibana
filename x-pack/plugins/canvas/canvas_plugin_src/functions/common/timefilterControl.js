export const timefilterControl = () => ({
  name: 'timefilterControl',
  aliases: [],
  type: 'render',
  context: {
    types: ['null'],
  },
  help: 'Configure a time filter control element',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
    compact: {
      type: ['boolean'],
      help: 'Show the time filter as a button that triggers a popover',
      default: true,
    },
  },
  fn: (context, args) => {
    return {
      type: 'render',
      as: 'time_filter',
      value: args,
    };
  },
});
