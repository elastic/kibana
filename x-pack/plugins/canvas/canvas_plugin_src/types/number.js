export const number = () => ({
  name: 'number',
  from: {
    null: () => 0,
    boolean: b => Number(b),
    string: n => Number(n),
  },
  to: {
    render: value => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: value => ({
      type: 'datatable',
      columns: [{ name: 'value', type: 'number' }],
      rows: [{ value }],
    }),
  },
});
