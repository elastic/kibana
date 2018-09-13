export const filter = () => ({
  name: 'filter',
  from: {
    null: () => {
      return {
        type: 'filter',
        // Any meta data you wish to pass along.
        meta: {},
        // And filters. If you need an "or", create a filter type for it.
        and: [],
      };
    },
  },
});
